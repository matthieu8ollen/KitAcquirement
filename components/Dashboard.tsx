import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts'
import { Package, TrendingUp, DollarSign, Target, Euro } from 'lucide-react'
import { inventoryService, salesService, expensesService } from '../lib/supabase'
import { InventoryItem, Sale, Expense, DashboardMetrics } from '../types'

const Dashboard: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [inventoryData, salesData, expensesData] = await Promise.all([
        inventoryService.getAll(),
        salesService.getAll(),
        expensesService.getAll()
      ])

      setInventory(inventoryData || [])
      setSales(salesData || [])
      setExpenses(expensesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate metrics
  const metrics: DashboardMetrics = {
    totalInStock: inventory.filter(item => item.status === 'In Stock').length,
    totalListed: inventory.filter(item => item.status === 'Listed').length,
    totalSold: inventory.filter(item => item.status === 'Sold').length,
    totalRevenue: sales.reduce((sum, sale) => sum + sale.sale_price, 0),
    totalProfit: sales.reduce((sum, sale) => sum + sale.profit, 0),
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    netProfit: sales.reduce((sum, sale) => sum + sale.profit, 0) - expenses.reduce((sum, expense) => sum + expense.amount, 0),
    sellThroughRate: inventory.length > 0 ? (metrics.totalSold / inventory.length) * 100 : 0
  }

  // Chart data
  const clubSalesData = sales.reduce((acc, sale) => {
    const club = sale.inventory?.club || 'Unknown'
    acc[club] = (acc[club] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const clubSalesChart = Object.entries(clubSalesData).map(([club, count]) => ({
    name: club,
    value: count
  }))

  const monthlySalesData = sales.reduce((acc, sale) => {
    const month = new Date(sale.sale_date).toLocaleDateString('en', { month: 'short', year: 'numeric' })
    acc[month] = (acc[month] || 0) + sale.sale_price
    return acc
  }, {} as Record<string, number>)

  const monthlySalesChart = Object.entries(monthlySalesData).map(([month, revenue]) => ({
    month,
    revenue
  }))

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Stock</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalInStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sold</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalSold}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Euro className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">€{metrics.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Net Profit</p>
              <p className="text-2xl font-bold text-gray-900">€{metrics.netProfit.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlySalesChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`€${value}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Club Sales Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Club</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={clubSalesChart}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {clubSalesChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sell-Through Rate</h3>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${Math.min(metrics.sellThroughRate, 100)}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">
              {metrics.sellThroughRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Sale Price</h3>
          <p className="text-3xl font-bold text-green-600">
            €{sales.length > 0 ? (metrics.totalRevenue / sales.length).toFixed(2) : '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600">€{metrics.totalExpenses.toFixed(2)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Inventory Value:</span>
            <span className="ml-2 text-gray-600">
              €{(inventory.reduce((sum, item) => sum + (item.status !== 'Sold' ? item.cost : 0), 0)).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="font-medium">Listed Items:</span>
            <span className="ml-2 text-gray-600">{metrics.totalListed}</span>
          </div>
          <div>
            <span className="font-medium">Avg. Profit/Sale:</span>
            <span className="ml-2 text-gray-600">
              €{sales.length > 0 ? (metrics.totalProfit / sales.length).toFixed(2) : '0.00'}
            </span>
          </div>
          <div>
            <span className="font-medium">ROI:</span>
            <span className="ml-2 text-gray-600">
              {metrics.totalExpenses > 0 ? ((metrics.netProfit / metrics.totalExpenses) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
