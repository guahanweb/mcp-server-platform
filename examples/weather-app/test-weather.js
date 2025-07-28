#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function testWeatherApp() {
  console.log('🧪 Testing Weather MCP Server...\n');
  
  // Start the weather app
  const weatherApp = spawn('node', ['dist/index.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  weatherApp.stdout.on('data', (data) => {
    output += data.toString();
  });

  weatherApp.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 1: List tools
  console.log('📋 Test 1: Listing available tools...');
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  };
  
  weatherApp.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: Get current weather
  console.log('🌡️  Test 2: Getting current weather for San Francisco...');
  const weatherRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "weather-api:get_current_weather",
      arguments: {
        location: "San Francisco, CA",
        units: "metric"
      }
    }
  };
  
  weatherApp.stdin.write(JSON.stringify(weatherRequest) + '\n');

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 3: Search locations
  console.log('🔍 Test 3: Searching for locations...');
  const searchRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "weather-api:search_locations",
      arguments: {
        query: "London",
        limit: 3
      }
    }
  };
  
  weatherApp.stdin.write(JSON.stringify(searchRequest) + '\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Clean shutdown
  weatherApp.kill('SIGTERM');

  await new Promise(resolve => {
    weatherApp.on('close', () => {
      resolve();
    });
  });

  console.log('\n📊 Test Results:');
  console.log('================');
  
  if (errorOutput.includes('Weather MCP Server started successfully')) {
    console.log('✅ Server started successfully');
  } else {
    console.log('❌ Server failed to start');
  }

  if (errorOutput.includes('demo mode')) {
    console.log('✅ Demo mode activated (no API key)');
  }

  if (output.includes('"tools"')) {
    console.log('✅ Tools list endpoint working');
  }

  if (output.includes('Current Weather') || output.includes('Demo Data')) {
    console.log('✅ Weather tool working');
  }

  if (output.includes('Location Search') || output.includes('Demo Location')) {
    console.log('✅ Location search working');
  }

  console.log('\n📝 Server Output:');
  console.log('==================');
  console.log(errorOutput);
  
  if (output) {
    console.log('\n📡 JSON-RPC Responses:');
    console.log('======================');
    console.log(output);
  }
}

testWeatherApp().catch(console.error);