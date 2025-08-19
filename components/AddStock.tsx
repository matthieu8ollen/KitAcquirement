import React, { useState } from 'react'
import { Plus, Package, AlertCircle } from 'lucide-react'
import { inventoryService } from '../lib/supabase'

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

  const clubs = [
    'Barcelona', 'Real Madrid', 'Liverpool', 'Bayern Munich', 
    'Manchester United', 'Arsenal', 'PSG', 'Chelsea', 'Manchester City',
    'AC Milan', 'Inter Milan', 'Juventus', 'Atletico Madrid', 'Borussia Dortmund'
  ]

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

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const existingCount = await getExistingCount(singleForm.club, singleForm.player, singleForm.size)
      const sku = generateSKU(singleForm.club, singleForm.player, singleForm.size, existingCount + 1)

      await inventoryService.create({
        sku,
        club: singleForm.club,
        player: singleForm.player || 'No Name',
        size: singleForm.size,
        cost: parseFloat(singleForm.cost),
        status: 'In Stock',
        purchase_date: new Date().toISOString().split('T')[0]
      })

      setMessage({ type: 'success', text: `Successfully added ${singleForm.club} ${singleForm.player || 'No Name'} (${singleForm.size})` })
      setSingleForm({ club: '', player: '', size: '', cost: '9.20' })
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
          }
        }
      }

      // Add all items
      for (const item of itemsToAdd) {
        await inventoryService.create(item)
      }

      const totalItems = itemsToAdd.length
      setMessage({ 
        type: 'success', 
        text: `Successfully added ${totalItems} items: ${bulkForm.club} ${bulkForm.player || 'No Name'}` 
      })
      
      setBulkForm({
        club: '',
        player: '',
        sizes: [{ size: 'M', quantity: 0 }, { size: 'L', quantity: 0 }, { size: 'XL', quantity: 0 }],
        cost: '9.20'
      })
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

      {/* Single Item Form */}
      {activeTab === 'single' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Add Single Item</h2>
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
                <select
                  value={singleForm.club}
                  onChange={(e) => setSingleForm({ ...singleForm, club: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a club</option>
                  {clubs.map(club => (
                    <option key={club} value={club}>{club}</option>
                  ))}
                </select>
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
              {loading ? 'Adding...' : 'Add Item'}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
                <select
                  value={bulkForm.club}
                  onChange={(e) => setBulkForm({ ...bulkForm, club: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a club</option>
                  {clubs.map(club => (
                    <option key={club} value={club}>{club}</option>
                  ))}
                </select>
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
              <div className="text-sm text-gray-600">
                <p>Total items to add: {bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0)}</p>
                <p>Total cost: €{(bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0) * parseFloat(bulkForm.cost || '0')).toFixed(2)}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0) === 0}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              {loading ? 'Adding...' : `Add ${bulkForm.sizes.reduce((sum, size) => sum + size.quantity, 0)} Items`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default AddStock
