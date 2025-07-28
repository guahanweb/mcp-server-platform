import { BasePlugin } from '@mcp/plugin-base';
import { PluginMetadata, MCPToolDefinition, MCPResourceDefinition, PluginContext } from '@mcp/types';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

export class WeatherPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    id: 'weather-api',
    name: 'Weather Plugin',
    version: '1.0.0',
    description: 'Provides weather information and forecasts using OpenWeatherMap API'
  };
  
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private geoUrl = 'https://api.openweathermap.org/geo/1.0';

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.OPENWEATHER_API_KEY || 'demo_key';
  }

  protected async onInitialize(): Promise<void> {
    if (this.apiKey === 'demo_key') {
      console.error('Using demo API key - replace with real OpenWeatherMap API key for production');
    }
  }

  protected defineTools(): MCPToolDefinition[] {
    return [
      this.createTool(
        'get_current_weather',
        'Get current weather conditions for a specific location',
        {
          location: {
            type: 'string',
            description: 'City name, state/country (e.g., "San Francisco, CA" or "London, UK")'
          },
          units: {
            type: 'string',
            enum: ['metric', 'imperial', 'kelvin'],
            description: 'Temperature units (metric=Celsius, imperial=Fahrenheit, kelvin=Kelvin)',
            default: 'metric'
          }
        },
        ['location'],
        this.getCurrentWeather.bind(this)
      ),
      
      this.createTool(
        'get_weather_forecast',
        'Get 5-day weather forecast for a specific location',
        {
          location: {
            type: 'string',
            description: 'City name, state/country (e.g., "San Francisco, CA" or "London, UK")'
          },
          units: {
            type: 'string',
            enum: ['metric', 'imperial', 'kelvin'],
            description: 'Temperature units (metric=Celsius, imperial=Fahrenheit, kelvin=Kelvin)',
            default: 'metric'
          }
        },
        ['location'],
        this.getWeatherForecast.bind(this)
      ),

      this.createTool(
        'search_locations',
        'Search for locations by name to get coordinates and full location details',
        {
          query: {
            type: 'string',
            description: 'Location search query (city name, partial name, etc.)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 5,
            minimum: 1,
            maximum: 10
          }
        },
        ['query'],
        this.searchLocations.bind(this)
      )
    ];
  }

  protected defineResources(): MCPResourceDefinition[] {
    return [
      this.createResource(
        'weather://current',
        'Current Weather Template',
        'Template for requesting current weather data',
        async () => ({ template: 'current weather' }),
        'application/json'
      ),
      this.createResource(
        'weather://forecast',
        'Weather Forecast Template', 
        'Template for requesting weather forecast data',
        async () => ({ template: 'weather forecast' }),
        'application/json'
      )
    ];
  }

  private async getCurrentWeather(params: any, context: PluginContext): Promise<any> {
    const { location, units = 'metric' } = params;

    if (this.apiKey === 'demo_key') {
      return {
        content: [{
          type: 'text',
          text: this.getDemoWeatherData(location, 'current')
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
    const weather: WeatherData = {
      location: `${name}, ${country}`,
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      forecast: []
    };

    const unitsSymbol = units === 'imperial' ? '°F' : units === 'kelvin' ? 'K' : '°C';
    const windUnit = units === 'imperial' ? 'mph' : 'm/s';

    return {
      content: [{
        type: 'text',
        text: `**Current Weather for ${weather.location}**\n\n` +
              `🌡️ Temperature: ${weather.temperature}${unitsSymbol}\n` +
              `☁️ Condition: ${weather.condition}\n` +
              `💧 Humidity: ${weather.humidity}%\n` +
              `💨 Wind Speed: ${weather.windSpeed} ${windUnit}`
      }]
    };
  }

  private async getWeatherForecast(params: any, context: PluginContext): Promise<any> {
    const { location, units = 'metric' } = params;

    if (this.apiKey === 'demo_key') {
      return {
        content: [{
          type: 'text',
          text: this.getDemoWeatherData(location, 'forecast')
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
    const unitsSymbol = units === 'imperial' ? '°F' : units === 'kelvin' ? 'K' : '°C';
    
    // Group forecasts by date
    const dailyForecasts = new Map<string, any[]>();
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date)!.push(item);
    });

    let forecastText = `**5-Day Weather Forecast for ${name}, ${country}**\n\n`;
    
    Array.from(dailyForecasts.entries()).slice(0, 5).forEach(([date, forecasts]) => {
      const temps = forecasts.map(f => f.main.temp);
      const conditions = forecasts.map(f => f.weather[0].description);
      const high = Math.round(Math.max(...temps));
      const low = Math.round(Math.min(...temps));
      const condition = conditions[Math.floor(conditions.length / 2)]; // Middle forecast of the day
      
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      forecastText += `**${dayName}, ${monthDay}**\n`;
      forecastText += `  High: ${high}${unitsSymbol} | Low: ${low}${unitsSymbol}\n`;
      forecastText += `  Condition: ${condition}\n\n`;
    });

    return {
      content: [{
        type: 'text',
        text: forecastText
      }]
    };
  }

  private async searchLocations(params: any, context: PluginContext): Promise<any> {
    const { query, limit = 5 } = params;

    if (this.apiKey === 'demo_key') {
      return {
        content: [{
          type: 'text',
          text: `**Demo Location Search Results for "${query}"**\n\n` +
                `🌍 San Francisco, CA, US (37.7749, -122.4194)\n` +
                `🌍 London, UK (51.5074, -0.1278)\n` +
                `🌍 Tokyo, JP (35.6762, 139.6503)\n` +
                `🌍 Paris, FR (48.8566, 2.3522)\n` +
                `🌍 New York, NY, US (40.7128, -74.0060)\n\n` +
                `*Note: Using demo data. Set OPENWEATHER_API_KEY for real results.*`
        }]
      };
    }

    const geoData = await this.geocodeLocation(query, limit);
    
    if (!geoData.length) {
      return {
        content: [{
          type: 'text',
          text: `No locations found for "${query}"`
        }]
      };
    }

    let resultsText = `**Location Search Results for "${query}"**\n\n`;
    geoData.forEach((location: GeoLocation) => {
      resultsText += `🌍 ${location.name}, ${location.country} (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})\n`;
    });

    return {
      content: [{
        type: 'text',
        text: resultsText
      }]
    };
  }

  private async geocodeLocation(location: string, limit: number = 1): Promise<GeoLocation[]> {
    const response = await fetch(
      `${this.geoUrl}/direct?q=${encodeURIComponent(location)}&limit=${limit}&appid=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private getDemoWeatherData(location: string, type: 'current' | 'forecast'): string {
    if (type === 'current') {
      return `**Current Weather for ${location}** (Demo Data)\n\n` +
             `🌡️ Temperature: 22°C\n` +
             `☁️ Condition: partly cloudy\n` +
             `💧 Humidity: 65%\n` +
             `💨 Wind Speed: 3.5 m/s\n\n` +
             `*Note: This is demo data. Set OPENWEATHER_API_KEY environment variable for real weather data.*`;
    } else {
      return `**5-Day Weather Forecast for ${location}** (Demo Data)\n\n` +
             `**Monday, Jan 29**\n  High: 24°C | Low: 18°C\n  Condition: sunny\n\n` +
             `**Tuesday, Jan 30**\n  High: 21°C | Low: 16°C\n  Condition: partly cloudy\n\n` +
             `**Wednesday, Jan 31**\n  High: 19°C | Low: 14°C\n  Condition: cloudy\n\n` +
             `**Thursday, Feb 1**\n  High: 17°C | Low: 12°C\n  Condition: light rain\n\n` +
             `**Friday, Feb 2**\n  High: 20°C | Low: 15°C\n  Condition: partly cloudy\n\n` +
             `*Note: This is demo data. Set OPENWEATHER_API_KEY environment variable for real weather data.*`;
    }
  }
}