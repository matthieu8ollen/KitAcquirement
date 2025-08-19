import React, { useState, useEffect } from 'react'
import { Package, ShoppingCart, CheckCircle, Euro, Eye, Edit } from 'lucide-react'
import { inventoryService, salesService } from '../lib/supabase'
import { InventoryItem } from '../types'

interface SaleModalProps {
  item: InventoryItem | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const SaleModal: React.FC<SaleModalProps> = ({ item, isOpen, onClose, onSave }) => {
  const [salePrice, setSalePrice] = useState('20.00')
  const [platform, setPlatform] = useState('Vinted')
  const [platformFees, setPlatformFees] = useState('1.20')
  const [shippingCost, setShippingCost] = useState('0.00')
  const [loading, setLoading] = useState(false)

  const calculateProfit = () => {
    const price = parseFloat(salePrice) || 0
    const fees = parseFloat(platformFees) || 0
    const shipping = parseFloat(shippingCost) || 0
    const cost = item?.cost || 0
    return price - fees - shipping - cost
  }

  const handleSave = async () => {
    if (!item) return

    setLoading(true)
    try {
      // Create sale record
      await salesService.create({
        inventory_id: item.id,
        sale_price: parseFloat(salePrice),
        platform,
        platform_fees: parseFloat(platformFees),
        shipping_cost: parseFloat(shippingCost),
        sale_date: new Date().toISOString().split('T')[0]
      })

      // Update inventory status
      await inventoryService.updateStatus(item.id, 'Sold')
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving sale:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Record Sale - {item.sku}</h3>
        
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

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between text-sm">
              <span>Cost:</span>
              <span>€{item.cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-green-600">
              <span>Profit:</span>
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
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Mark as Sold'}
          </button>
        </div>
      </div>
    </div>
  )
}

const InventoryGrid: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'In Stock' | 'Listed' | 'Sold'>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showSaleModal, setShowSaleModal] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const data = await inventoryService.getAll()
      setInventory(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (item: InventoryItem, newStatus: 'In Stock' | 'Listed' | 'Sold') => {
    if (newStatus === 'Sold') {
      setSelectedItem(item)
      setShowSaleModal(true)
      return
    }

    try {
      await inventoryService.updateStatus(item.id, newStatus)
      fetchInventory()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-blue-100 text-blue-800'
      case 'Listed': return 'bg-yellow-100 text-yellow-800'
      case 'Sold': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Stock': return <Package className="w-4 h-4" />
      case 'Listed': return <ShoppingCart className="w-4 h-4" />
      case 'Sold': return <CheckCircle className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  const filteredInventory = inventory.filter(item => 
    filter === 'all' || item.status === filter
  )

  const statusCounts = {
    'In Stock': inventory.filter(item => item.status === 'In Stock').length,
    'Listed': inventory.filter(item => item.status === 'Listed').length,
    'Sold': inventory.filter(item => item.status === 'Sold').length
  }

  if (loading) {
    return <div className="text-center py-8">Loading inventory...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <div className="text-sm text-gray-500">
          {filteredInventory.length} of {inventory.length} items
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All', count: inventory.length },
            { key: 'In Stock', label: 'In Stock', count: statusCounts['In Stock'] },
            { key: 'Listed', label: 'Listed', count: statusCounts['Listed'] },
            { key: 'Sold', label: 'Sold', count: statusCounts['Sold'] }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredInventory.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{item.club}</h3>
                <p className="text-sm text-gray-600">{item.player || 'No Name'}</p>
                <p className="text-xs text-gray-500">Size: {item.size}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
                {item.status}
              </div>
            </div>

            {/* SKU and Cost */}
            <div className="mb-4 space-y-1">
              <p className="text-xs font-mono text-gray-500">{item.sku}</p>
              <p className="text-sm text-gray-600">Cost: €{item.cost.toFixed(2)}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {item.status === 'In Stock' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusChange(item, 'Listed')}
                    className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 flex items-center justify-center gap-1"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    List
                  </button>
                  <button
                    onClick={() => handleStatusChange(item, 'Sold')}
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center justify-center gap-1"
                  >
                    <Euro className="w-4 h-4" />
                    Sold
                  </button>
                </div>
              )}

              {item.status === 'Listed' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusChange(item, 'In Stock')}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center justify-center gap-1"
                  >
                    <Package className="w-4 h-4" />
                    Unlist
                  </button>
                  <button
                    onClick={() => handleStatusChange(item, 'Sold')}
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center justify-center gap-1"
                  >
                    <Euro className="w-4 h-4" />
                    Sold
                  </button>
                </div>
              )}

              {item.status === 'Sold' && (
                <div className="text-center text-sm text-green-600 font-medium py-2">
                  ✓ Sold
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' ? 'No inventory items yet.' : `No items with status "${filter}".`}
          </p>
        </div>
      )}

      {/* Sale Modal */}
      <SaleModal
        item={selectedItem}
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false)
          setSelectedItem(null)
        }}
        onSave={fetchInventory}
      />
    </div>
  )
}

export default InventoryGrid
