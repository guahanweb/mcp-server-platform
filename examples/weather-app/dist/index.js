#!/usr/bin/env node
"use strict";

// src/index.ts
var import_server_core = require("@mcp/server-core");

// src/weather-plugin.ts
var import_plugin_base = require("@mcp/plugin-base");
var WeatherPlugin = class extends import_plugin_base.BasePlugin {
  metadata = {
    id: "weather-api",
    name: "Weather Plugin",
    version: "1.0.0",
    description: "Provides weather information and forecasts using OpenWeatherMap API"
  };
  apiKey;
  baseUrl = "https://api.openweathermap.org/data/2.5";
  geoUrl = "https://api.openweathermap.org/geo/1.0";
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.OPENWEATHER_API_KEY || "demo_key";
  }
  async onInitialize() {
    if (this.apiKey === "demo_key") {
      console.error("Using demo API key - replace with real OpenWeatherMap API key for production");
    }
  }
  defineTools() {
    return [
      this.createTool(
        "get_current_weather",
        "Get current weather conditions for a specific location",
        {
          location: {
            type: "string",
            description: 'City name, state/country (e.g., "San Francisco, CA" or "London, UK")'
          },
          units: {
            type: "string",
            enum: ["metric", "imperial", "kelvin"],
            description: "Temperature units (metric=Celsius, imperial=Fahrenheit, kelvin=Kelvin)",
            default: "metric"
          }
        },
        ["location"],
        this.getCurrentWeather.bind(this)
      ),
      this.createTool(
        "get_weather_forecast",
        "Get 5-day weather forecast for a specific location",
        {
          location: {
            type: "string",
            description: 'City name, state/country (e.g., "San Francisco, CA" or "London, UK")'
          },
          units: {
            type: "string",
            enum: ["metric", "imperial", "kelvin"],
            description: "Temperature units (metric=Celsius, imperial=Fahrenheit, kelvin=Kelvin)",
            default: "metric"
          }
        },
        ["location"],
        this.getWeatherForecast.bind(this)
      ),
      this.createTool(
        "search_locations",
        "Search for locations by name to get coordinates and full location details",
        {
          query: {
            type: "string",
            description: "Location search query (city name, partial name, etc.)"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            default: 5,
            minimum: 1,
            maximum: 10
          }
        },
        ["query"],
        this.searchLocations.bind(this)
      )
    ];
  }
  defineResources() {
    return [
      this.createResource(
        "weather://current",
        "Current Weather Template",
        "Template for requesting current weather data",
        async () => ({ template: "current weather" }),
        "application/json"
      ),
      this.createResource(
        "weather://forecast",
        "Weather Forecast Template",
        "Template for requesting weather forecast data",
        async () => ({ template: "weather forecast" }),
        "application/json"
      )
    ];
  }
  async getCurrentWeather(params, context) {
    const { location, units = "metric" } = params;
    if (this.apiKey === "demo_key") {
      return {
        content: [{
          type: "text",
          text: this.getDemoWeatherData(location, "current")
        }]
      };
    }
    const geoData = await this.geocodeLocation(location);
    if (!geoData.length) {
      throw new Error(`Location "${location}" not found`);
    }
    const { lat, lon, name, country } = geoData[0];
    const response = await fetch(
      `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${this.apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const weather = {
      location: `${name}, ${country}`,
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      forecast: []
    };
    const unitsSymbol = units === "imperial" ? "\xB0F" : units === "kelvin" ? "K" : "\xB0C";
    const windUnit = units === "imperial" ? "mph" : "m/s";
    return {
      content: [{
        type: "text",
        text: `**Current Weather for ${weather.location}**

\u{1F321}\uFE0F Temperature: ${weather.temperature}${unitsSymbol}
\u2601\uFE0F Condition: ${weather.condition}
\u{1F4A7} Humidity: ${weather.humidity}%
\u{1F4A8} Wind Speed: ${weather.windSpeed} ${windUnit}`
      }]
    };
  }
  async getWeatherForecast(params, context) {
    const { location, units = "metric" } = params;
    if (this.apiKey === "demo_key") {
      return {
        content: [{
          type: "text",
          text: this.getDemoWeatherData(location, "forecast")
        }]
      };
    }
    const geoData = await this.geocodeLocation(location);
    if (!geoData.length) {
      throw new Error(`Location "${location}" not found`);
    }
    const { lat, lon, name, country } = geoData[0];
    const response = await fetch(
      `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${this.apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const unitsSymbol = units === "imperial" ? "\xB0F" : units === "kelvin" ? "K" : "\xB0C";
    const dailyForecasts = /* @__PURE__ */ new Map();
    data.list.forEach((item) => {
      const date = new Date(item.dt * 1e3).toISOString().split("T")[0];
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date).push(item);
    });
    let forecastText = `**5-Day Weather Forecast for ${name}, ${country}**

`;
    Array.from(dailyForecasts.entries()).slice(0, 5).forEach(([date, forecasts]) => {
      const temps = forecasts.map((f) => f.main.temp);
      const conditions = forecasts.map((f) => f.weather[0].description);
      const high = Math.round(Math.max(...temps));
      const low = Math.round(Math.min(...temps));
      const condition = conditions[Math.floor(conditions.length / 2)];
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      forecastText += `**${dayName}, ${monthDay}**
`;
      forecastText += `  High: ${high}${unitsSymbol} | Low: ${low}${unitsSymbol}
`;
      forecastText += `  Condition: ${condition}

`;
    });
    return {
      content: [{
        type: "text",
        text: forecastText
      }]
    };
  }
  async searchLocations(params, context) {
    const { query, limit = 5 } = params;
    if (this.apiKey === "demo_key") {
      return {
        content: [{
          type: "text",
          text: `**Demo Location Search Results for "${query}"**

\u{1F30D} San Francisco, CA, US (37.7749, -122.4194)
\u{1F30D} London, UK (51.5074, -0.1278)
\u{1F30D} Tokyo, JP (35.6762, 139.6503)
\u{1F30D} Paris, FR (48.8566, 2.3522)
\u{1F30D} New York, NY, US (40.7128, -74.0060)

*Note: Using demo data. Set OPENWEATHER_API_KEY for real results.*`
        }]
      };
    }
    const geoData = await this.geocodeLocation(query, limit);
    if (!geoData.length) {
      return {
        content: [{
          type: "text",
          text: `No locations found for "${query}"`
        }]
      };
    }
    let resultsText = `**Location Search Results for "${query}"**

`;
    geoData.forEach((location) => {
      resultsText += `\u{1F30D} ${location.name}, ${location.country} (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})
`;
    });
    return {
      content: [{
        type: "text",
        text: resultsText
      }]
    };
  }
  async geocodeLocation(location, limit = 1) {
    const response = await fetch(
      `${this.geoUrl}/direct?q=${encodeURIComponent(location)}&limit=${limit}&appid=${this.apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  }
  getDemoWeatherData(location, type) {
    if (type === "current") {
      return `**Current Weather for ${location}** (Demo Data)

\u{1F321}\uFE0F Temperature: 22\xB0C
\u2601\uFE0F Condition: partly cloudy
\u{1F4A7} Humidity: 65%
\u{1F4A8} Wind Speed: 3.5 m/s

*Note: This is demo data. Set OPENWEATHER_API_KEY environment variable for real weather data.*`;
    } else {
      return `**5-Day Weather Forecast for ${location}** (Demo Data)

**Monday, Jan 29**
  High: 24\xB0C | Low: 18\xB0C
  Condition: sunny

**Tuesday, Jan 30**
  High: 21\xB0C | Low: 16\xB0C
  Condition: partly cloudy

**Wednesday, Jan 31**
  High: 19\xB0C | Low: 14\xB0C
  Condition: cloudy

**Thursday, Feb 1**
  High: 17\xB0C | Low: 12\xB0C
  Condition: light rain

**Friday, Feb 2**
  High: 20\xB0C | Low: 15\xB0C
  Condition: partly cloudy

*Note: This is demo data. Set OPENWEATHER_API_KEY environment variable for real weather data.*`;
    }
  }
};

// src/index.ts
async function main() {
  const apiKey = process.env.OPENWEATHER_API_KEY || process.argv[2];
  if (!apiKey) {
    console.error("\u26A0\uFE0F  No OpenWeatherMap API key provided. Using demo mode.");
    console.error("To get real weather data:");
    console.error("1. Get a free API key from https://openweathermap.org/api");
    console.error("2. Set OPENWEATHER_API_KEY environment variable");
    console.error("3. Or pass the API key as a command line argument");
    console.error("");
    console.error("Starting in demo mode...");
    console.error("");
  }
  const server = new import_server_core.MCPServer({
    name: "weather-server",
    version: "1.0.0",
    transport: { type: "stdio" }
  });
  const weatherPlugin = new WeatherPlugin(apiKey);
  await server.registerPlugin(weatherPlugin);
  try {
    await server.start();
    console.error("\u{1F324}\uFE0F  Weather MCP Server started successfully!");
    console.error("Available tools:");
    console.error("  - get_current_weather: Get current weather for a location");
    console.error("  - get_weather_forecast: Get 5-day forecast for a location");
    console.error("  - search_locations: Search for locations by name");
    console.error("");
    if (!apiKey || apiKey === "demo_key") {
      console.error("\u{1F527} Running in demo mode - set OPENWEATHER_API_KEY for real data");
    } else {
      console.error("\u{1F511} Using OpenWeatherMap API key for real weather data");
    }
    console.error("");
  } catch (error) {
    console.error("\u274C Failed to start weather server:", error);
    process.exit(1);
  }
}
process.on("SIGINT", () => {
  console.error("\n\u{1F44B} Weather server shutting down...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.error("\n\u{1F44B} Weather server shutting down...");
  process.exit(0);
});
main().catch((error) => {
  console.error("\u274C Weather server error:", error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map