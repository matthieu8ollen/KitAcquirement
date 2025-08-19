import React, { useState, useEffect } from 'react'
import { Package, ShoppingCart, CheckCircle, Euro, ChevronDown, ChevronUp, Users, Shirt, MoreVertical, Trash2 } from 'lucide-react'
import { inventoryService, salesService } from '../lib/supabase'
import { InventoryItem } from '../types'

interface SizeGroup {
  size: string
  items: InventoryItem[]
  inStock: number
  listed: number
  sold: number
}

interface PlayerGroup {
  player: string | null
  sizeGroups: SizeGroup[]
  totalItems: number
  inStock: number
  listed: number
  sold: number
}

interface ClubGroup {
  club: string
  playerGroups: PlayerGroup[]
  totalItems: number
  inStock: number
  listed: number
  sold: number
}

interface DropdownMenuProps {
  items: InventoryItem[]
  onAction: (action: string, items: InventoryItem[]) => void
  title: string
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ items, onAction, title }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const availableItems = items.filter(item => item.status !== 'Sold')
  const hasAvailableItems = availableItems.length > 0
  const hasSoldItems = items.some(item => item.status === 'Sold')
  
  if (!hasAvailableItems && !hasSoldItems) return null
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
      >
        <MoreVertical className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
                {title}
              </div>
              
              <button
                onClick={() => {
                  onAction('mark-in-stock', availableItems)
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Package className="w-4 h-4 mr-2 text-blue-600" />
                Mark as In Stock
              </button>
              
              <button
                onClick={() => {
                  onAction('mark-listed', availableItems)
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <ShoppingCart className="w-4 h-4 mr-2 text-yellow-600" />
                Mark as Listed
              </button>
              
              <button
                onClick={() => {
                  onAction('mark-sold', availableItems)
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Euro className="w-4 h-4 mr-2 text-green-600" />
                Mark as Sold
              </button>
              
              <div className="border-t border-gray-100">
                <button
                  onClick={() => {
                    onAction('delete', items.filter(item => item.status !== 'Sold'))
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Items
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface SaleModalProps {
  selectedItems: InventoryItem[]
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  title: string
}

const SaleModal: React.FC<SaleModalProps> = ({ selectedItems, isOpen, onClose, onSave, title }) => {
  const [selectedSKU, setSelectedSKU] = useState('')
  const [salePrice, setSalePrice] = useState('20.00')
  const [platform, setPlatform] = useState('Vinted')
  const [platformFees, setPlatformFees] = useState('0.00')
  const [shippingCost, setShippingCost] = useState('0.00')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedItems.length > 0) {
      // Default to first available item
      const availableItem = selectedItems.find(item => item.status === 'In Stock' || item.status === 'Listed')
      if (availableItem) {
        setSelectedSKU(availableItem.id)
      }
    }
  }, [selectedItems])

  const selectedItem = selectedItems.find(item => item.id === selectedSKU)

  const calculateProfit = () => {
    const price = parseFloat(salePrice) || 0
    const fees = parseFloat(platformFees) || 0
    const shipping = parseFloat(shippingCost) || 0
    const cost = selectedItem?.cost || 0
    return price - fees - shipping - cost
  }

  const handleSave = async () => {
    if (!selectedItem) return

    setLoading(true)
    try {
      await salesService.create({
        inventory_id: selectedItem.id,
        sale_price: parseFloat(salePrice),
        platform,
        platform_fees: parseFloat(platformFees),
        shipping_cost: parseFloat(shippingCost),
        sale_date: new Date().toISOString().split('T')[0]
      })

      await inventoryService.updateStatus(selectedItem.id, 'Sold')
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving sale:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || selectedItems.length === 0) return null

  const availableItems = selectedItems.filter(item => item.status === 'In Stock' || item.status === 'Listed')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Record Sale - {title}</h3>
        
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
              <span>€{(selectedItem?.cost || 0).toFixed(2)}</span>
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
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([])
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [saleModalTitle, setSaleModalTitle] = useState('')
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set())
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  // Create hierarchical grouping: Club > Player > Size
  const groupedInventory = React.useMemo(() => {
    const clubs = new Map<string, ClubGroup>()
    
    inventory.forEach(item => {
      // Skip items that don't match the filter
      if (filter !== 'all') {
        if (filter === 'In Stock' && item.status !== 'In Stock') return
        if (filter === 'Listed' && item.status !== 'Listed') return
        if (filter === 'Sold' && item.status !== 'Sold') return
      }

      if (!clubs.has(item.club)) {
        clubs.set(item.club, {
          club: item.club,
          playerGroups: [],
          totalItems: 0,
          inStock: 0,
          listed: 0,
          sold: 0
        })
      }
      
      const clubGroup = clubs.get(item.club)!
      const playerName = item.player || 'No Name'
      
      let playerGroup = clubGroup.playerGroups.find(p => (p.player || 'No Name') === playerName)
      if (!playerGroup) {
        playerGroup = {
          player: item.player,
          sizeGroups: [],
          totalItems: 0,
          inStock: 0,
          listed: 0,
          sold: 0
        }
        clubGroup.playerGroups.push(playerGroup)
      }
      
      let sizeGroup = playerGroup.sizeGroups.find(s => s.size === item.size)
      if (!sizeGroup) {
        sizeGroup = {
          size: item.size,
          items: [],
          inStock: 0,
          listed: 0,
          sold: 0
        }
        playerGroup.sizeGroups.push(sizeGroup)
      }
      
      sizeGroup.items.push(item)
      
      // Update counts - only count this specific item
      if (item.status === 'In Stock') {
        sizeGroup.inStock++
        playerGroup.inStock++
        clubGroup.inStock++
      } else if (item.status === 'Listed') {
        sizeGroup.listed++
        playerGroup.listed++
        clubGroup.listed++
      } else if (item.status === 'Sold') {
        sizeGroup.sold++
        playerGroup.sold++
        clubGroup.sold++
      }
      
      // Update total item counts
      playerGroup.totalItems++
      clubGroup.totalItems++
    })
    
    return Array.from(clubs.values())
  }, [inventory, filter])

  const handleAction = async (action: string, items: InventoryItem[]) => {
    try {
      setMessage(null)
      
      switch (action) {
        case 'mark-in-stock':
          for (const item of items) {
            if (item.status !== 'Sold') {
              await inventoryService.updateStatus(item.id, 'In Stock')
            }
          }
          setMessage({ type: 'success', text: `${items.length} items marked as In Stock` })
          break
          
        case 'mark-listed':
          for (const item of items) {
            if (item.status !== 'Sold') {
              await inventoryService.updateStatus(item.id, 'Listed')
            }
          }
          setMessage({ type: 'success', text: `${items.length} items marked as Listed` })
          break
          
        case 'mark-sold':
          // For sold, we still want to open the sale modal to record details
          const availableItems = items.filter(item => item.status !== 'Sold')
          if (availableItems.length > 0) {
            const firstItem = availableItems[0]
            setSelectedItems(availableItems)
            setSaleModalTitle(`${firstItem.club} ${firstItem.player || 'No Name'} ${firstItem.size}`)
            setShowSaleModal(true)
            return // Don't show success message yet, will show after sale is recorded
          }
          break
          
        case 'delete':
          const confirmDelete = confirm(`Are you sure you want to permanently delete ${items.length} item(s)? This action cannot be undone.`)
          if (confirmDelete) {
            for (const item of items) {
              await inventoryService.delete(item.id)
            }
            setMessage({ type: 'success', text: `${items.length} items deleted permanently` })
          }
          break
      }
      
      fetchInventory()
      
      // Clear message after 3 seconds
      if (action !== 'mark-sold') {
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error performing action:', error)
      setMessage({ type: 'error', text: 'Error performing action. Please try again.' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSellItems = (items: InventoryItem[], title: string) => {
    const availableItems = items.filter(item => item.status === 'In Stock' || item.status === 'Listed')
    if (availableItems.length === 0) return
    
    setSelectedItems(availableItems)
    setSaleModalTitle(title)
    setShowSaleModal(true)
  }

  const handleBulkStatusChange = async (items: InventoryItem[], newStatus: 'In Stock' | 'Listed') => {
    try {
      const availableItems = items.filter(item => item.status !== 'Sold')
      for (const item of availableItems) {
        await inventoryService.updateStatus(item.id, newStatus)
      }
      fetchInventory()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const toggleExpansion = (type: 'club' | 'player' | 'size', key: string) => {
    let setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>
    let currentExpanded: Set<string>
    
    if (type === 'club') {
      setExpanded = setExpandedClubs
      currentExpanded = expandedClubs
    } else if (type === 'player') {
      setExpanded = setExpandedPlayers
      currentExpanded = expandedPlayers
    } else {
      setExpanded = setExpandedSizes
      currentExpanded = expandedSizes
    }
    
    const newExpanded = new Set(currentExpanded)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpanded(newExpanded)
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
          {groupedInventory.length} clubs • {inventory.filter(item => {
            if (filter === 'all') return true
            return item.status === filter
          }).length} items
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex">
            <div className="h-5 w-5 mr-2">
              {message.type === 'success' ? '✓' : '⚠'}
            </div>
            <span>{message.text}</span>
          </div>
        </div>
      )}

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

      {/* Hierarchical Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {groupedInventory.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'No inventory items yet.' : `No items with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {groupedInventory.map((clubGroup) => {
                  const clubKey = clubGroup.club
                  const isClubExpanded = expandedClubs.has(clubKey)
                  
                  return (
                    <React.Fragment key={clubKey}>
                      {/* Club Header */}
                      <tr className="border-b-2 border-gray-200 bg-blue-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleExpansion('club', clubKey)}
                              className="mr-3 text-blue-600 hover:text-blue-800"
                            >
                              {isClubExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            <div className="flex items-center">
                              <Shirt className="w-5 h-5 mr-2 text-blue-600" />
                              <span className="text-lg font-bold text-blue-900">{clubGroup.club}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">All sizes</td>
                        <td className="px-6 py-4 text-sm text-gray-600">-</td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold text-blue-900">{clubGroup.totalItems}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            {clubGroup.inStock > 0 && (
                              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                                {clubGroup.inStock} In Stock
                              </span>
                            )}
                            {clubGroup.listed > 0 && (
                              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                                {clubGroup.listed} Listed
                              </span>
                            )}
                            {clubGroup.sold > 0 && (
                              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                                {clubGroup.sold} Sold
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">Expand to see actions</span>
                        </td>
                      </tr>

                      {/* Player Groups */}
                      {isClubExpanded && clubGroup.playerGroups.map((playerGroup) => {
                        const playerKey = `${clubKey}-${playerGroup.player || 'No Name'}`
                        const isPlayerExpanded = expandedPlayers.has(playerKey)
                        
                        return (
                          <React.Fragment key={playerKey}>
                            {/* Player Header */}
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <td className="px-6 py-3">
                                <div className="flex items-center pl-8">
                                  <button
                                    onClick={() => toggleExpansion('player', playerKey)}
                                    className="mr-3 text-gray-600 hover:text-gray-800"
                                  >
                                    {isPlayerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-2 text-gray-600" />
                                    <span className="font-medium text-gray-900">{playerGroup.player || 'No Name'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-600">All sizes</td>
                              <td className="px-6 py-3 text-sm text-gray-600">-</td>
                              <td className="px-6 py-3">
                                <span className="font-medium text-gray-900">{playerGroup.totalItems}</span>
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex space-x-1">
                                  {playerGroup.inStock > 0 && (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                      {playerGroup.inStock}
                                    </span>
                                  )}
                                  {playerGroup.listed > 0 && (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                      {playerGroup.listed}
                                    </span>
                                  )}
                                  {playerGroup.sold > 0 && (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      {playerGroup.sold}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                <span className="text-xs text-gray-500">Expand for actions</span>
                              </td>
                            </tr>

                            {/* Size Groups */}
                            {isPlayerExpanded && playerGroup.sizeGroups.map((sizeGroup) => {
                              const sizeKey = `${playerKey}-${sizeGroup.size}`
                              const isSizeExpanded = expandedSizes.has(sizeKey)
                              const hasAvailable = sizeGroup.inStock > 0 || sizeGroup.listed > 0
                              
                              return (
                                <React.Fragment key={sizeKey}>
                                  {/* Size Header */}
                                  <tr className="hover:bg-gray-25">
                                    <td className="px-6 py-3">
                                      <div className="flex items-center pl-16">
                                        <button
                                          onClick={() => toggleExpansion('size', sizeKey)}
                                          className="mr-3 text-gray-400 hover:text-gray-600"
                                        >
                                          {isSizeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                        <span className="text-sm text-gray-700">Size {sizeGroup.size}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="font-medium text-gray-900">{sizeGroup.size}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="text-sm text-gray-900">€{sizeGroup.items[0]?.cost.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="text-sm font-medium text-gray-900">{sizeGroup.items.length}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="flex space-x-1">
                                        {sizeGroup.inStock > 0 && (
                                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                            <Package className="w-3 h-3 mr-1" />
                                            {sizeGroup.inStock}
                                          </span>
                                        )}
                                        {sizeGroup.listed > 0 && (
                                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                            <ShoppingCart className="w-3 h-3 mr-1" />
                                            {sizeGroup.listed}
                                          </span>
                                        )}
                                        {sizeGroup.sold > 0 && (
                                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            {sizeGroup.sold}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      {hasAvailable && (
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleBulkStatusChange(sizeGroup.items, 'Listed')}
                                            className="inline-flex items-center px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                                          >
                                            List All
                                          </button>
                                          <button
                                            onClick={() => handleSellItems(sizeGroup.items, `${clubGroup.club} ${playerGroup.player || 'No Name'} ${sizeGroup.size}`)}
                                            className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                          >
                                            Sell
                                          </button>
                                          <DropdownMenu
                                            items={sizeGroup.items}
                                            onAction={handleAction}
                                            title={`${clubGroup.club} ${playerGroup.player || 'No Name'} ${sizeGroup.size}`}
                                          />
                                        </div>
                                      )}
                                    </td>
                                  </tr>

                                  {/* Individual Items */}
                                  {isSizeExpanded && sizeGroup.items.map((item) => (
                                    <tr key={item.id} className="bg-gray-25">
                                      <td className="px-6 py-2">
                                        <div className="pl-24 text-xs font-mono text-gray-600">{item.sku}</div>
                                      </td>
                                      <td className="px-6 py-2 text-xs text-gray-500">-</td>
                                      <td className="px-6 py-2 text-xs text-gray-500">-</td>
                                      <td className="px-6 py-2 text-xs text-gray-500">Individual</td>
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
                                              onClick={() => inventoryService.updateStatus(item.id, item.status === 'In Stock' ? 'Listed' : 'In Stock').then(fetchInventory)}
                                              className="inline-flex items-center px-1 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                            >
                                              {item.status === 'In Stock' ? 'List' : 'Unlist'}
                                            </button>
                                            <button
                                              onClick={() => handleSellItems([item], `${item.club} ${item.player || 'No Name'} ${item.size}`)}
                                              className="inline-flex items-center px-1 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                            >
                                              Sell
                                            </button>
                                            <DropdownMenu
                                              items={[item]}
                                              onAction={handleAction}
                                              title={item.sku}
                                            />
                                          </div>
                                        )}
                                        {item.status === 'Sold' && (
                                          <div className="flex space-x-1">
                                            <span className="text-xs text-green-600">Sold</span>
                                            <DropdownMenu
                                              items={[item]}
                                              onAction={handleAction}
                                              title={item.sku}
                                            />
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
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
        selectedItems={selectedItems}
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false)
          setSelectedItems([])
        }}
        onSave={fetchInventory}
        title={saleModalTitle}
      />
    </div>
  )
}

export default InventoryGrid
