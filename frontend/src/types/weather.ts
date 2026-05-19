export interface WeatherCurrent {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  uvIndex: number
  condition: string
  conditionIcon: string
  visibility?: number
  location: string
}

export interface WeatherForecast {
  date: string
  minTemp: number
  maxTemp: number
  condition: string
  conditionIcon: string
  precipitation: number
}

export interface WeatherLocation {
  name: string
  lat: number
  lng: number
  country?: string
}