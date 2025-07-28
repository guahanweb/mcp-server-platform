# Weather App MCP Server Example

A comprehensive example of building an MCP (Model Context Protocol) server using the MCP Server Platform toolkit. This weather app demonstrates tool creation, API integration, error handling, and resource management.

## Features

- **Current Weather**: Get real-time weather conditions for any location
- **5-Day Forecast**: Detailed weather predictions with daily highs/lows  
- **Location Search**: Find and validate locations by name with coordinates
- **Demo Mode**: Works without API key for testing and development
- **Multiple Units**: Support for Celsius, Fahrenheit, and Kelvin
- **Error Handling**: Robust error handling with informative messages
- **Resource Templates**: MCP resource definitions for weather data

## Quick Start

### 1. Installation

```bash
# From the examples/weather-app directory
npm install

# Or from project root
npm install --workspace=examples/weather-app
```

### 2. Get API Key (Optional)

For real weather data, get a free API key from [OpenWeatherMap](https://openweathermap.org/api):

1. Sign up at openweathermap.org
2. Generate a free API key
3. Set the environment variable:

```bash
export OPENWEATHER_API_KEY="your_api_key_here"
```

### 3. Build and Run

```bash
# Build the server
npm run build

# Start the server
npm start

# Or with API key as argument
npm start your_api_key_here
```

### 4. Test the Server

The server uses stdio transport for command-line interaction. You can test it with MCP client tools or integrate it with AI assistants that support the MCP protocol.

## Available Tools

### `get_current_weather`

Get current weather conditions for a specific location.

**Parameters:**
- `location` (required): City name, state/country (e.g., "San Francisco, CA", "London, UK")
- `units` (optional): Temperature units - "metric" (°C), "imperial" (°F), or "kelvin" (K)

**Example:**
```json
{
  "method": "get_current_weather",
  "params": {
    "location": "San Francisco, CA",
    "units": "metric"
  }
}
```

### `get_weather_forecast`

Get a 5-day weather forecast for a specific location.

**Parameters:**
- `location` (required): City name, state/country
- `units` (optional): Temperature units - "metric", "imperial", or "kelvin"

**Example:**
```json
{
  "method": "get_weather_forecast", 
  "params": {
    "location": "Tokyo, Japan",
    "units": "metric"
  }
}
```

### `search_locations`

Search for locations by name to get coordinates and location details.

**Parameters:**
- `query` (required): Location search query
- `limit` (optional): Maximum results to return (1-10, default: 5)

**Example:**
```json
{
  "method": "search_locations",
  "params": {
    "query": "Springfield",
    "limit": 3
  }
}
```

## Demo Mode

The server includes a demo mode that works without an API key:

- Returns realistic sample weather data
- All tools function normally with mock responses  
- Useful for development, testing, and demonstrations
- Shows clear indicators that demo data is being used

## Architecture

### Plugin Structure

The `WeatherPlugin` extends `BasePlugin` from `@mcp/plugin-base`:

```typescript
export class WeatherPlugin extends BasePlugin {
  name = 'weather';
  version = '1.0.0';
  
  // Plugin lifecycle
  async initialize(): Promise<void> { /* ... */ }
  async shutdown(): Promise<void> { /* ... */ }
  
  // Tool definitions  
  getTools(): Tool[] { /* ... */ }
  getResources(): Resource[] { /* ... */ }
  
  // Request handling
  async handleToolCall(request: MCPRequest): Promise<MCPResponse> { /* ... */ }
}
```

### Server Setup

The main server file demonstrates:

- Server initialization with plugins
- Transport configuration (stdio for CLI usage)
- Environment variable handling
- Graceful shutdown handling
- Error management and logging

### Key Features Demonstrated

1. **Tool Creation**: Using `createTool()` helper for type-safe tool definitions
2. **API Integration**: HTTP requests to external weather APIs  
3. **Error Handling**: Comprehensive error catching and user-friendly messages
4. **Resource Management**: MCP resource definitions for templates
5. **Environment Configuration**: API key management and fallback modes
6. **Type Safety**: Full TypeScript integration with MCP types

## Development

### Project Structure

```
weather-app/
├── src/
│   ├── index.ts           # Main server entry point
│   └── weather-plugin.ts  # Weather plugin implementation
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tsup.config.ts        # Build configuration
└── README.md             # This file
```

### Available Scripts

- `npm run build` - Build the TypeScript code
- `npm run dev` - Build in watch mode for development
- `npm start` - Start the built server
- `npm run typecheck` - Type check without building

### Extending the Plugin

To add more weather features:

1. **Add New Tools**: Extend the `getTools()` method
2. **Handle New Requests**: Add cases to `handleToolCall()`
3. **Add Resources**: Define templates in `getResources()`
4. **Custom Data**: Implement data transformation logic

Example of adding a new tool:

```typescript
getTools(): Tool[] {
  return [
    // ... existing tools
    this.createTool({
      name: 'get_weather_alerts',
      description: 'Get weather alerts and warnings for a location',
      inputSchema: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location to check for alerts' }
        },
        required: ['location']
      }
    })
  ];
}
```

## Integration Examples

### With AI Assistants

This MCP server can be integrated with AI assistants that support the Model Context Protocol:

- **Claude Desktop**: Add to MCP server configuration
- **Custom AI Apps**: Use MCP client libraries to connect
- **Command Line Tools**: Direct stdio communication

### Configuration Example

For Claude Desktop, add to your MCP configuration:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/weather-app/dist/index.js"],
      "env": {
        "OPENWEATHER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Error Handling

The plugin includes comprehensive error handling:

- **API Errors**: Network issues, invalid API keys, rate limits
- **Location Errors**: Unknown locations, geocoding failures  
- **Input Validation**: Missing parameters, invalid units
- **Graceful Degradation**: Demo mode when API unavailable

All errors return structured MCP error responses with helpful messages.

## Performance Considerations

- **Caching**: Consider adding response caching for frequently requested locations
- **Rate Limiting**: OpenWeatherMap has API rate limits (60 calls/minute for free tier)
- **Batching**: Group multiple requests when possible
- **Timeouts**: HTTP requests include reasonable timeout values

## Next Steps

This example demonstrates the core concepts of MCP server development. To build more complex servers:

1. **Add Orchestration**: Use `@mcp/orchestration` for workflow management
2. **Multiple Plugins**: Combine weather with other data sources
3. **State Management**: Add session-based preferences and history
4. **Advanced Tools**: Implement tools with complex input/output schemas
5. **Custom Transports**: Add HTTP or WebSocket transport options

## Resources

- [MCP Server Platform Documentation](../../README.md)
- [OpenWeatherMap API Documentation](https://openweathermap.org/api)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)