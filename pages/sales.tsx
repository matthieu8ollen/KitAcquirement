import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, Euro, Edit, Trash2, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import { salesService } from '../lib/supabase'
import { Sale } from '../types'

interface EditSaleModalProps {
  sale: Sale | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, isOpen, onClose, onSave }) => {
  const [salePrice, setSalePrice] = useState('')
  const [platform, setPlatform] = useState('')
  const [platformFees, setPlatformFees] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [saleDate, setSaleDate] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sale) {
      setSalePrice(sale.sale_price.toString())
      setPlatform(sale.platform)
      setPlatformFees(sale.platform_fees.toString())
      setShippingCost(sale.shipping_cost.toString())
      setSaleDate(sale.sale_date)
    }
  }, [sale])

  const calculateProfit = () => {
    const price = parseFloat(salePrice) || 0
    const fees = parseFloat(platformFees) || 0
    const shipping = parseFloat(shippingCost) || 0
    const cost = sale?.inventory?.cost || 0
    return price - fees - shipping - cost
  }

  const handleSave = async () => {
    if (!sale) return

    setLoading(true)
    try {
      await salesService.update(sale.id, {
        sale_price: parseFloat(salePrice),
        platform,
        platform_fees: parseFloat(platformFees),
        shipping_cost: parseFloat(shippingCost),
        sale_date: saleDate,
        profit: calculateProfit()
      })
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error updating sale:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !sale) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Sale - {sale.inventory?.sku}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (€)</label>
            <input
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Vinted">Vinted</option>
              <option value="Depop">Depop</option>
              <option value="eBay">eBay</option>
              <option value="Facebook Marketplace">Facebook Marketplace</option>
              <option value="Instagram">Instagram</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fees (€)</label>
            <input
              type="number"
              step="0.01"
              value={platformFees}
              onChange={(e) => setPlatformFees(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost (€)</label>
            <input
              type="number"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between text-sm">
              <span>Cost:</span>
              <span>€{(sale.inventory?.cost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-green-600">
              <span>New Profit:</span>
              <span>€{calculateProfit().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Update Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    setShowEditModal(true)
  }

  const handleDelete = async (sale: Sale) => {
    if (!confirm(`Are you sure you want to delete this sale of ${sale.inventory?.club} ${sale.inventory?.player || 'No Name'}?`)) {
      return
    }

    try {
      await salesService.delete(sale.id)
      // Note: You might want to also update the inventory status back to 'Listed' or 'In Stock'
      setMessage({ type: 'success', text: 'Sale deleted successfully!' })
      fetchSales()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error deleting sale:', error)
      setMessage({ type: 'error', text: 'Error deleting sale. Please try again.' })
      setTimeout(() => setMessage(null), 3000)
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

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="flex">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{message.text}</span>
            </div>
          </div>
        )}

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(sale)}
                            className="inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
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

        {/* Edit Sale Modal */}
        <EditSaleModal
          sale={editingSale}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingSale(null)
          }}
          onSave={fetchSales}
        />
      </div>
    </Layout>
  )
}

export default SalesPage
