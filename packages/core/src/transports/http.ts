import { ServerTransport, Logger, CorsOptions } from '@mcp/types';
import { EventEmitter } from 'events';
import express, { Application } from 'express';
import cors from 'cors';
import { Server } from 'http';

export interface HttpTransportOptions {
  port?: number;
  host?: string;
  cors?: CorsOptions;
  maxBodySize?: string;
  trustProxy?: boolean;
}

export class HttpTransport extends EventEmitter implements ServerTransport {
  private app: Application;
  private server?: Server;
  private logger: Logger;
  private options: HttpTransportOptions;

  constructor(options: HttpTransportOptions, logger: Logger) {
    super();
    this.options = options;
    this.logger = logger;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS
    const corsOptions: CorsOptions = {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
      credentials: true,
      ...this.options.cors
    };
    this.app.use(cors(corsOptions));

    // Body parsing
    this.app.use(express.json({ limit: this.options.maxBodySize || '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: this.options.maxBodySize || '10mb' }));

    // Trust proxy
    if (this.options.trustProxy) {
      this.app.set('trust proxy', true);
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        transport: 'http'
      });
    });

    // MCP endpoint
    this.app.post('/mcp', (req, res) => {
      const { method, params, id } = req.body;
      
      // Extract context from headers
      const requestData = {
        method,
        params,
        id,
        sessionId: req.headers['x-session-id'] as string,
        userId: req.headers['x-user-id'] as string,
        workflowId: req.headers['x-workflow-id'] as string,
        message: req.body.message || '',
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          timestamp: new Date()
        }
      };
      
      // Emit request event
      this.emit('request', requestData, (response: any) => {
        res.json(response);
      });
    });

    // Error handling
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('HTTP transport error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    });
  }

  async start(): Promise<void> {
    const port = this.options.port || 3002;
    const host = this.options.host || 'localhost';

    return new Promise((resolve) => {
      this.server = this.app.listen(port, host, () => {
        this.logger.info(`HTTP transport started on ${host}:${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.logger.info('HTTP transport stopped');
          resolve();
        });
      });
    }
  }

  async send(data: any): Promise<void> {
    // HTTP is request/response based, so direct send is not applicable
    throw new Error('HTTP transport does not support direct send operations');
  }

  getApp(): Application {
    return this.app;
  }
}