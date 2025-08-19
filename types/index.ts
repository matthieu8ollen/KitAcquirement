export interface InventoryItem {
  id: string
  sku: string
  club: string
  player: string | null
  size: string
  cost: number
  status: 'In Stock' | 'Listed' | 'Sold'
  purchase_date: string
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  inventory_id: string
  sale_price: number
  platform: string
  platform_fees: number
  shipping_cost: number
  profit: number
  sale_date: string
  created_at: string
  inventory?: InventoryItem
}

export interface Expense {
  id: string
  category: string
  description: string | null
  amount: number
  expense_date: string
  created_at: string
}

export interface DashboardMetrics {
  totalInStock: number
  totalListed: number
  totalSold: number
  totalRevenue: number
  totalProfit: number
  totalExpenses: number
  netProfit: number
  sellThroughRate: number
}

export interface ChartData {
  name: string
  value: number
  [key: string]: any
}
