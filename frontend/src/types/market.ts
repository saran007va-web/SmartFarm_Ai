export interface MarketPrice {
  id?: string
  crop: string
  price: number
  unit: string
  marketName: string
  date: string
  change?: number
}

export interface MarketPriceHistory {
  crop: string
  history: MarketPrice[]
}