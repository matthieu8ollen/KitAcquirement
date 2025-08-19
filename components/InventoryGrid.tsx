import React, { useState, useEffect } from 'react'
import { Package, ShoppingCart, CheckCircle, Euro, ChevronDown, ChevronUp } from 'lucide-react'
import { inventoryService, salesService } from '../lib/supabase'
import { InventoryItem } from '../types'

interface GroupedItem {
  club: string
  player: string | null
  size: string
  cost: number
  items: InventoryItem[]
  inStock: number
  listed: number
  sold: number
}

interface SaleModalProps {
  group: GroupedItem | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const SaleModal: React.FC<SaleModalProps> = ({ group, isOpen, onClose, onSave }) => {
  const [selectedSKU, setSelectedSKU] = useState('')
  const [salePrice, setSalePrice] = useState('20.00')
  const [platform, setPlatform] = useState('Vinted')
  const [platformFees, setPlatformFees] = useState('0.00')
  const [shippingCost, setShippingCost] = useState('0.00')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (group && group.items.length > 0) {
      // Default to first available item (In Stock or Listed)
      const availableItem = group.items.find(item => item.status === 'In Stock' || item.status === 'Listed')
      if (availableItem) {
        setSelectedSKU(availableItem.id)
      }
    }
  }, [group])

  const calculateProfit = () => {
    const price = parseFloat(salePrice) || 0
    const fees = parseFloat(platformFees) || 0
    const shipping = parseFloat(shippingCost) || 0
    const cost = group?.cost || 0
    return price - fees - shipping - cost
  }

  const handleSave = async () => {
    if (!group || !selectedSKU) return

    const selectedItem = group.items.find(item => item.id === selectedSKU)
    if (!selectedItem) return

    setLoading(true)
    try {
      // Create sale record
      await salesService.create({
        inventory_id: selectedItem.id,
        sale_price: parseFloat(salePrice),
        platform,
        platform_fees: parseFloat(platformFees),
        shipping_cost: parseFloat(shippingCost),
        sale_date: new Date().toISOString().split('T')[0]
      })

      // Update inventory status
      await inventoryService.updateStatus(selectedItem.id, 'Sold')
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving sale:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !group) return null

  const availableItems = group.items.filter(item => item.status === 'In Stock' || item.status === 'Listed')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          Record Sale - {group.club} {group.player || 'No Name'} ({group.size})
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Specific Kit</label>
            <select
              value={selectedSKU}
              onChange={(e) => setSelectedSKU(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Choose which kit to sell</option>
              {availableItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.sku} ({item.status})
                </option>
              ))}
            </select>
          </div>

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
              <span>€{group.cost.toFixed(2)}</span>
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
            disabled={loading || !selectedSKU}
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
  const [filter, setFilter] = useState<'all' | 'In Stock' | 'Listed' | 'Sold'>('In Stock')
  const [selectedGroup, setSelectedGroup] = useState<GroupedItem | null>(null)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

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

  // Group identical items together
  const groupedInventory = React.useMemo(() => {
    const groups = new Map<string, GroupedItem>()
    
    inventory.forEach(item => {
      const key = `${item.club}-${item.player || 'No Name'}-${item.size}`
      
      if (!groups.has(key)) {
        groups.set(key, {
          club: item.club,
          player: item.player,
          size: item.size,
          cost: item.cost,
          items: [],
          inStock: 0,
          listed: 0,
          sold: 0
        })
      }
      
      const group = groups.get(key)!
      group.items.push(item)
      
      if (item.status === 'In Stock') group.inStock++
      else if (item.status === 'Listed') group.listed++
      else if (item.status === 'Sold') group.sold++
    })
    
    return Array.from(groups.values())
  }, [inventory])

  const filteredGroups = groupedInventory.filter(group => {
    if (filter === 'all') return true
    if (filter === 'In Stock') return group.inStock > 0
    if (filter === 'Listed') return group.listed > 0
    if (filter === 'Sold') return group.sold > 0
    return false
  })

  const handleBulkStatusChange = async (group: GroupedItem, newStatus: 'In Stock' | 'Listed' | 'Sold') => {
    if (newStatus === 'Sold') {
      setSelectedGroup(group)
      setShowSaleModal(true)
      return
    }

    try {
      // Update all items in the group that are not sold
      const availableItems = group.items.filter(item => item.status !== 'Sold')
      for (const item of availableItems) {
        await inventoryService.updateStatus(item.id, newStatus)
      }
      fetchInventory()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleSingleStatusChange = async (item: InventoryItem, newStatus: 'In Stock' | 'Listed' | 'Sold') => {
    if (newStatus === 'Sold') {
      const group = groupedInventory.find(g => 
        g.club === item.club && 
        (g.player || 'No Name') === (item.player || 'No Name') && 
        g.size === item.size
      )
      if (group) {
        setSelectedGroup(group)
        setShowSaleModal(true)
      }
      return
    }

    try {
      await inventoryService.updateStatus(item.id, newStatus)
      fetchInventory()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

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
          {filteredGroups.length} groups • {inventory.length} total items
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

      {/* Grouped Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'No inventory items yet.' : `No items with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kit Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGroups.map((group) => {
                  const groupKey = `${group.club}-${group.player || 'No Name'}-${group.size}`
                  const isExpanded = expandedGroups.has(groupKey)
                  const hasAvailableItems = group.inStock > 0 || group.listed > 0
                  
                  return (
                    <React.Fragment key={groupKey}>
                      {/* Group Header Row */}
                      <tr className="hover:bg-gray-50 bg-gray-25">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleGroupExpansion(groupKey)}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{group.club}</div>
                              <div className="text-sm text-gray-500">{group.player || 'No Name'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{group.size}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">€{group.cost.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {group.items.length} total
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            {group.inStock > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                <Package className="w-3 h-3 mr-1" />
                                {group.inStock}
                              </span>
                            )}
                            {group.listed > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                {group.listed}
                              </span>
                            )}
                            {group.sold > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {group.sold}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {hasAvailableItems && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleBulkStatusChange(group, 'Listed')}
                                className="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                List All
                              </button>
                              <button
                                onClick={() => handleBulkStatusChange(group, 'Sold')}
                                className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                <Euro className="w-3 h-3 mr-1" />
                                Sell One
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Individual Items (when expanded) */}
                      {isExpanded && group.items.map((item) => (
                        <tr key={item.id} className="bg-gray-50">
                          <td className="px-6 py-2 pl-12">
                            <div className="text-xs font-mono text-gray-600">{item.sku}</div>
                          </td>
                          <td className="px-6 py-2">
                            <div className="text-xs text-gray-600">-</div>
                          </td>
                          <td className="px-6 py-2">
                            <div className="text-xs text-gray-600">-</div>
                          </td>
                          <td className="px-6 py-2">
                            <div className="text-xs text-gray-600">Individual</div>
                          </td>
                          <td className="px-6 py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              item.status === 'In Stock' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'Listed' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-2">
                            {item.status !== 'Sold' && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleSingleStatusChange(item, item.status === 'In Stock' ? 'Listed' : 'In Stock')}
                                  className="inline-flex items-center px-1 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                >
                                  {item.status === 'In Stock' ? 'List' : 'Unlist'}
                                </button>
                                <button
                                  onClick={() => handleSingleStatusChange(item, 'Sold')}
                                  className="inline-flex items-center px-1 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                >
                                  Sell
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Modal */}
      <SaleModal
        group={selectedGroup}
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false)
          setSelectedGroup(null)
        }}
        onSave={fetchInventory}
      />
    </div>
  )
}

export default InventoryGrid
