import { ServerTransport, Logger } from '@mcp/types';
import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import express from 'express';

export interface WebSocketTransportOptions {
  port?: number;
  host?: string;
  path?: string;
  heartbeatInterval?: number;
  maxConnections?: number;
}

export class WebSocketTransport extends EventEmitter implements ServerTransport {
  private wss?: WebSocketServer;
  private httpServer?: Server;
  private connections: Map<string, WebSocket> = new Map();
  private logger: Logger;
  private options: WebSocketTransportOptions;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(options: WebSocketTransportOptions, logger: Logger) {
    super();
    this.options = options;
    this.logger = logger;
  }

  async start(): Promise<void> {
    const port = this.options.port || 3003;
    const host = this.options.host || 'localhost';
    const path = this.options.path || '/ws';

    // Create HTTP server for WebSocket
    const app = express();
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        transport: 'websocket',
        connections: this.connections.size,
        timestamp: new Date().toISOString()
      });
    });

    this.httpServer = app.listen(port, host);

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path,
      maxPayload: 1024 * 1024 // 1MB
    });

    this.setupWebSocketHandlers();
    this.startHeartbeat();

    this.logger.info(`WebSocket transport started on ${host}:${port}${path}`);
  }

  private setupWebSocketHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request) => {
      const connectionId = this.generateConnectionId();
      this.connections.set(connectionId, ws);
      
      this.logger.debug(`WebSocket connection established: ${connectionId}`);

      // Check connection limit
      if (this.options.maxConnections && this.connections.size > this.options.maxConnections) {
        ws.close(1013, 'Server overloaded');
        this.connections.delete(connectionId);
        return;
      }

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Add connection context
          const requestData = {
            ...message,
            connectionId,
            sessionId: message.sessionId || connectionId,
            userId: message.userId || 'anonymous',
            metadata: {
              connectionId,
              userAgent: request.headers['user-agent'],
              ip: request.socket.remoteAddress,
              timestamp: new Date()
            }
          };

          // Emit request event
          this.emit('request', requestData, (response: any) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(response));
            }
          });
        } catch (error) {
          this.logger.error('Error parsing WebSocket message:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error'
              },
              id: null
            }));
          }
        }
      });

      ws.on('close', (code, reason) => {
        this.connections.delete(connectionId);
        this.logger.debug(`WebSocket connection closed: ${connectionId} (${code})`);
      });

      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });

      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        connectionId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  private startHeartbeat(): void {
    const interval = this.options.heartbeatInterval || 30000;
    
    this.heartbeatInterval = setInterval(() => {
      for (const [connectionId, ws] of this.connections) {
        if ((ws as any).isAlive === false) {
          this.logger.debug(`Terminating dead connection: ${connectionId}`);
          ws.terminate();
          this.connections.delete(connectionId);
          continue;
        }

        (ws as any).isAlive = false;
        ws.ping();
      }
    }, interval);
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const [connectionId, ws] of this.connections) {
      ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          resolve();
        });
      });
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => {
          this.logger.info('WebSocket transport stopped');
          resolve();
        });
      });
    }
  }

  async send(data: any): Promise<void> {
    const message = JSON.stringify(data);
    let sent = 0;

    for (const [connectionId, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent++;
      } else {
        // Clean up dead connections
        this.connections.delete(connectionId);
      }
    }

    this.logger.debug(`Broadcast message to ${sent} connections`);
  }

  broadcast(data: any, filter?: (connectionId: string) => boolean): void {
    const message = JSON.stringify(data);
    let sent = 0;

    for (const [connectionId, ws] of this.connections) {
      if (filter && !filter(connectionId)) {
        continue;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sent++;
      } else {
        this.connections.delete(connectionId);
      }
    }

    this.logger.debug(`Broadcast message to ${sent} connections`);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}