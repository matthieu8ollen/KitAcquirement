import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, Euro, ExternalLink } from 'lucide-react'
import Layout from '../components/Layout'
import { salesService } from '../lib/supabase'
import { Sale } from '../types'

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const data = await salesService.getAll()
      setSales(data || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const platforms = ['all', ...Array.from(new Set(sales.map(sale => sale.platform)))]
  
  const filteredSales = sales.filter(sale => 
    filter === 'all' || sale.platform === filter
  )

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.sale_price, 0)
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0)

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      'Vinted': 'bg-blue-100 text-blue-800',
      'Depop': 'bg-purple-100 text-purple-800',
      'eBay': 'bg-yellow-100 text-yellow-800',
      'Facebook Marketplace': 'bg-blue-100 text-blue-800',
      'Instagram': 'bg-pink-100 text-pink-800',
      'Other': 'bg-gray-100 text-gray-800'
    }
    return colors[platform] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">Loading sales...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
          <div className="text-sm text-gray-500">
            {filteredSales.length} sales
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{filteredSales.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Euro className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">€{totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Profit</p>
                <p className="text-2xl font-bold text-gray-900">€{totalProfit.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            {platforms.map(platform => (
              <button
                key={platform}
                onClick={() => setFilter(platform)}
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  filter === platform
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {platform} {platform !== 'all' && `(${sales.filter(s => s.platform === platform).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' ? 'No sales recorded yet.' : `No sales on ${filter}.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {sale.inventory?.club || 'Unknown Club'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.inventory?.player || 'No Name'} • Size {sale.inventory?.size}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {sale.inventory?.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPlatformColor(sale.platform)}`}>
                          {sale.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{sale.sale_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        €{(sale.platform_fees + sale.shipping_cost).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          €{sale.profit.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Insights */}
        {filteredSales.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Average Sale Price:</span>
                <span className="ml-2 text-gray-600">€{(totalRevenue / filteredSales.length).toFixed(2)}</span>
              </div>
              <div>
                <span className="font-medium">Average Profit/Sale:</span>
                <span className="ml-2 text-gray-600">€{(totalProfit / filteredSales.length).toFixed(2)}</span>
              </div>
              <div>
                <span className="font-medium">Profit Margin:</span>
                <span className="ml-2 text-gray-600">{((totalProfit / totalRevenue) * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="font-medium">Best Platform:</span>
                <span className="ml-2 text-gray-600">
                  {platforms.slice(1).reduce((best, platform) => {
                    const platformSales = sales.filter(s => s.platform === platform)
                    const bestSales = sales.filter(s => s.platform === best)
                    return platformSales.length > bestSales.length ? platform : best
                  }, platforms[1] || 'None')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default SalesPage
