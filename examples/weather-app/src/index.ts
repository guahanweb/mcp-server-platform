#!/usr/bin/env node

import { MCPServer } from '@mcp/server-core';
import { WeatherPlugin } from './weather-plugin';

async function main() {
  // Get API key from environment or command line
  const apiKey = process.env.OPENWEATHER_API_KEY || process.argv[2];
  
  if (!apiKey) {
    console.error('⚠️  No OpenWeatherMap API key provided. Using demo mode.');
    console.error('To get real weather data:');
    console.error('1. Get a free API key from https://openweathermap.org/api');
    console.error('2. Set OPENWEATHER_API_KEY environment variable');
    console.error('3. Or pass the API key as a command line argument');
    console.error('');
    console.error('Starting in demo mode...');
    console.error('');
  }

  // Create server with stdio transport (for CLI usage)
  const server = new MCPServer({
    name: 'weather-server',
    version: '1.0.0',
    transport: { type: 'stdio' }
  });
  
  // Add weather plugin
  const weatherPlugin = new WeatherPlugin(apiKey);
  await server.registerPlugin(weatherPlugin);
  
  // Start server
  try {
    await server.start();
    console.error('🌤️  Weather MCP Server started successfully!');
    console.error('Available tools:');
    console.error('  - get_current_weather: Get current weather for a location');
    console.error('  - get_weather_forecast: Get 5-day forecast for a location');
    console.error('  - search_locations: Search for locations by name');
    console.error('');
    
    if (!apiKey || apiKey === 'demo_key') {
      console.error('🔧 Running in demo mode - set OPENWEATHER_API_KEY for real data');
    } else {
      console.error('🔑 Using OpenWeatherMap API key for real weather data');
    }
    console.error('');
  } catch (error) {
    console.error('❌ Failed to start weather server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n👋 Weather server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n👋 Weather server shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('❌ Weather server error:', error);
  process.exit(1);
});