import React, { useState } from 'react'
import { Plus, Package, AlertCircle } from 'lucide-react'
import { inventoryService, expensesService } from '../lib/supabase'

interface BulkAddForm {
  club: string
  player: string
  sizes: { size: string; quantity: number }[]
  cost: string
}

const AddStock: React.FC = () => {
  const [singleForm, setSingleForm] = useState({
    club: '',
    player: '',
    size: '',
    cost: '9.20'
  })

  const [bulkForm, setBulkForm] = useState<BulkAddForm>({
    club: '',
    player: '',
    sizes: [{ size: 'M', quantity: 0 }, { size: 'L', quantity: 0 }, { size: 'XL', quantity: 0 }],
    cost: '9.20'
  })

  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [existingClubs, setExistingClubs] = useState<string[]>([])
  const [clubSuggestions, setClubSuggestions] = useState<string[]>([])
  const [showClubSuggestions, setShowClubSuggestions] = useState(false)

  useEffect(() => {
    fetchExistingClubs()
  }, [])

  const fetchExistingClubs = async () => {
    try {
      const inventory = await inventoryService.getAll()
      const clubs = Array.from(new Set(inventory.map(item => item.club))).sort()
      setExistingClubs(clubs)
    } catch (error) {
      console.error('Error fetching clubs:', error)
    }
  }

  const handleClubInput = (value: string, formType: 'single' | 'bulk') => {
    // Update the form
    if (formType === 'single') {
      setSingleForm({ ...singleForm, club: value })
    } else {
      setBulkForm({ ...bulkForm, club: value })
    }

    // Show suggestions if typing
    if (value.length > 0) {
      const filtered = existingClubs.filter(club => 
        club.toLowerCase().includes(value.toLowerCase())
      )
      setClubSuggestions(filtered)
      setShowClubSuggestions(filtered.length > 0)
    } else {
      setShowClubSuggestions(false)
    }
  }

  const selectClubSuggestion = (club: string, formType: 'single' | 'bulk') => {
    if (formType === 'single') {
      setSingleForm({ ...singleForm, club })
    } else {
      setBulkForm({ ...bulkForm, club })
    }
    setShowClubSuggestions(false)
  }

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  // Generate SKU
  const generateSKU = (club: string, player: string, size: string, count: number = 1) => {
    const clubCode = club.split(' ').map(word => word.slice(0, 3).toUpperCase()).join('')
    const playerCode = player === 'No Name' || !player ? 'BLANK' : player.split(' ').map(word => word.slice(0, 3).toUpperCase()).join('')
    return `${clubCode}-${playerCode}-${size}-${count.toString().padStart(2, '0')}`
  }

  // Get existing count for SKU generation
  const getExistingCount = async (club: string, player: string, size: string) => {
    try {
      const allInventory = await inventoryService.getAll()
      const clubCode = club.split(' ').map(word => word.slice(0, 3).toUpperCase()).join('')
      const playerCode = player === 'No Name' || !player ? 'BLANK' : player.split(' ').map(word => word.slice(0, 3).toUpperCase()).join('')
      
      const existingItems = allInventory.filter(item => 
        item.sku.startsWith(`${clubCode}-${playerCode}-${size}-`)
      )
      
      return existingItems.length
    } catch (error) {
      console.error('Error getting existing count:', error)
      return 0
    }
  }

  const createExpenseRecord = async (description: string, totalCost: number) => {
    try {
      await expensesService.create({
        category: 'Stock Purchase',
        description,
        amount: totalCost,
        expense_date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Error creating expense record:', error)
      throw error
    }
  }

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const existingCount = await getExistingCount(singleForm.club, singleForm.player, singleForm.size)
      const sku = generateSKU(singleForm.club, singleForm.player, singleForm.size, existingCount + 1)
      const cost = parseFloat(singleForm.cost)

      // Create inventory item
      await inventoryService.create({
        sku,
        club: singleForm.club,
        player: singleForm.player || 'No Name',
        size: singleForm.size,
        cost,
        status: 'In Stock',
        purchase_date: new Date().toISOString().split('T')[0]
      })

      // Create expense record
      const expenseDescription = `${singleForm.club} ${singleForm.player || 'No Name'} kit (${singleForm.size})`
      await createExpenseRecord(expenseDescription, cost)

      setMessage({ 
        type: 'success', 
        text: `Successfully added ${singleForm.club} ${singleForm.player || 'No Name'} (${singleForm.size}) and recorded €${cost.toFixed(2)} expense!` 
      })
      setSingleForm({ club: '', player: '', size: '', cost: '9.20' })
      
      // Refresh clubs list for autocomplete
      fetchExistingClubs()
    } catch (error) {
      console.error('Error adding item:', error)
      setMessage({ type: 'error', text: 'Error adding item. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const itemsToAdd = []
      let totalItems = 0
      
      for (const sizeEntry of bulkForm.sizes) {
        if (sizeEntry.quantity > 0) {
          const existingCount = await getExistingCount(bulkForm.club, bulkForm.player, sizeEntry.size)
          
          for (let i = 1; i <= sizeEntry.quantity; i++) {
            const sku = generateSKU(bulkForm.club, bulkForm.player, sizeEntry.size, existingCount + i)
            itemsToAdd.push({
              sku,
              club: bulkForm.club,
              player: bulkForm.player || 'No Name',
              size: sizeEntry.size,
              cost: parseFloat(bulkForm.cost),
              status: 'In Stock' as const,
              purchase_date: new Date().toISOString().split('T')[0]
            })
            totalItems++
          }
        }
      }

      // Add all inventory items
      for (const item of itemsToAdd) {
        await inventoryService.create(item)
      }

      // Create expense record for the bulk purchase
      const totalCost = totalItems * parseFloat(bulkForm.cost)
      const sizeBreakdown = bulkForm.sizes
        .filter(s => s.quantity > 0)
        .map(s => `${s.quantity}x ${s.size}`)
        .join(', ')
      const expenseDescription = `${bulkForm.club} ${bulkForm.player || 'No Name'} kits (${sizeBreakdown})`
      
      await createExpenseRecord(expenseDescription, totalCost)

      setMessage({ 
        type: 'success', 
        text: `Successfully added ${totalItems} items: ${bulkForm.club} ${bulkForm.player || 'No Name'} and recorded €${totalCost.toFixed(2)} expense!` 
      })
      
      setBulkForm({
        club: '',
        player: '',
        sizes: [{ size: 'M', quantity: 0 }, { size: 'L', quantity: 0 }, { size: 'XL', quantity: 0 }],
        cost: '9.20'
      })
      
      // Refresh clubs list for autocomplete
      fetchExistingClubs()
    } catch (error) {
      console.error('Error adding bulk items:', error)
      setMessage({ type: 'error', text: 'Error adding items. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const updateBulkSize = (index: number, quantity: number) => {
    const updatedSizes = [...bulkForm.sizes]
    updatedSizes[index].quantity = Math.max(0, quantity)
    setBulkForm({ ...bulkForm, sizes: updatedSizes })
  }

  const getTotalCost = () => {
    if (activeTab === 'single') {
      return parseFloat(singleForm.cost) || 0
    } else {
      const totalItems = bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0)
      return totalItems * (parseFloat(bulkForm.cost) || 0)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Add New Stock</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('single')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Single Item
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bulk'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bulk Add
          </button>
        </nav>
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

      {/* Expense Preview */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Package className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Auto-Expense:</strong> Adding this stock will automatically create a €{getTotalCost().toFixed(2)} expense under "Stock Purchase"
            </p>
          </div>
        </div>
      </div>

      {/* Single Item Form */}
      {activeTab === 'single' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Add Single Item</h2>
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
                <input
                  type="text"
                  value={singleForm.club}
                  onChange={(e) => handleClubInput(e.target.value, 'single')}
                  onBlur={() => setTimeout(() => setShowClubSuggestions(false), 200)}
                  onFocus={() => {
                    if (singleForm.club.length > 0 && clubSuggestions.length > 0) {
                      setShowClubSuggestions(true)
                    }
                  }}
                  placeholder="e.g., Ajax, Barcelona, Real Madrid..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {existingClubs.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Start typing to see suggestions from your {existingClubs.length} existing clubs
                  </p>
                )}
                {existingClubs.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Start typing to see suggestions from your {existingClubs.length} existing clubs
                  </p>
                )}
                
                {/* Club Suggestions */}
                {showClubSuggestions && clubSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {clubSuggestions.map((club) => (
                      <button
                        key={club}
                        type="button"
                        onClick={() => selectClubSuggestion(club, 'single')}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                      >
                        {club}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player (optional)</label>
                <input
                  type="text"
                  value={singleForm.player}
                  onChange={(e) => setSingleForm({ ...singleForm, player: e.target.value })}
                  placeholder="e.g., Mbappé #9, Lamine Yamal #10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <select
                  value={singleForm.size}
                  onChange={(e) => setSingleForm({ ...singleForm, size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select size</option>
                  {sizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={singleForm.cost}
                  onChange={(e) => setSingleForm({ ...singleForm, cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Adding...' : `Add Item + €${getTotalCost().toFixed(2)} Expense`}
            </button>
          </form>
        </div>
      )}

      {/* Bulk Add Form */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Bulk Add Items</h2>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
                <input
                  type="text"
                  value={bulkForm.club}
                  onChange={(e) => handleClubInput(e.target.value, 'bulk')}
                  onBlur={() => setTimeout(() => setShowClubSuggestions(false), 200)}
                  onFocus={() => {
                    if (bulkForm.club.length > 0 && clubSuggestions.length > 0) {
                      setShowClubSuggestions(true)
                    }
                  }}
                  placeholder="e.g., Ajax, Barcelona, Real Madrid..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                
                {/* Club Suggestions */}
                {showClubSuggestions && clubSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {clubSuggestions.map((club) => (
                      <button
                        key={club}
                        type="button"
                        onClick={() => selectClubSuggestion(club, 'bulk')}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                      >
                        {club}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player (optional)</label>
                <input
                  type="text"
                  value={bulkForm.player}
                  onChange={(e) => setBulkForm({ ...bulkForm, player: e.target.value })}
                  placeholder="e.g., Mbappé #9, Lamine Yamal #10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantities by Size</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {bulkForm.sizes.map((sizeEntry, index) => (
                  <div key={sizeEntry.size}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{sizeEntry.size}</label>
                    <input
                      type="number"
                      min="0"
                      value={sizeEntry.quantity}
                      onChange={(e) => updateBulkSize(index, parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="md:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost per item (€)</label>
              <input
                type="number"
                step="0.01"
                value={bulkForm.cost}
                onChange={(e) => setBulkForm({ ...bulkForm, cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Total items to add: {bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0)}</p>
                <p>Total inventory cost: €{getTotalCost().toFixed(2)}</p>
                <p className="font-medium text-blue-600">Auto expense will be created: €{getTotalCost().toFixed(2)}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0) === 0}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              {loading ? 'Adding...' : `Add ${bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0)} Items + €${getTotalCost().toFixed(2)} Expense`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default AddStock
