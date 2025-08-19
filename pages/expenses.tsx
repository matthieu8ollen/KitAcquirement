import React, { useState, useEffect } from 'react'
import { DollarSign, Plus, Calendar, Tag, AlertCircle, Edit, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import { expensesService } from '../lib/supabase'
import { Expense } from '../types'

interface EditExpenseModalProps {
  expense: Expense | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ expense, isOpen, onClose, onSave }) => {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [loading, setLoading] = useState(false)

  const categories = [
    'Stock Purchase',
    'Packaging',
    'Printing',
    'Shipping',
    'PayPal Fees',
    'Marketing',
    'Office Supplies',
    'Other'
  ]

  useEffect(() => {
    if (expense) {
      setCategory(expense.category)
      setDescription(expense.description || '')
      setAmount(expense.amount.toString())
      setExpenseDate(expense.expense_date)
    }
  }, [expense])

  const handleSave = async () => {
    if (!expense) return

    setLoading(true)
    try {
      await expensesService.update(expense.id, {
        category,
        description: description || null,
        amount: parseFloat(amount),
        expense_date: expenseDate
      })
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error updating expense:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !expense) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Expense</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 100 poly mailers from Amazon"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
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
            {loading ? 'Saving...' : 'Update Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const categories = [
    'Stock Purchase',
    'Packaging',
    'Printing',
    'Shipping',
    'PayPal Fees',
    'Marketing',
    'Office Supplies',
    'Other'
  ]

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const data = await expensesService.getAll()
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await expensesService.create({
        category: newExpense.category,
        description: newExpense.description || null,
        amount: parseFloat(newExpense.amount),
        expense_date: newExpense.expense_date
      })

      setMessage({ type: 'success', text: 'Expense added successfully!' })
      setNewExpense({
        category: '',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0]
      })
      setShowAddForm(false)
      fetchExpenses()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error adding expense:', error)
      setMessage({ type: 'error', text: 'Error adding expense. Please try again.' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowEditModal(true)
  }

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete this expense: ${expense.category} - €${expense.amount.toFixed(2)}?`)) {
      return
    }

    try {
      await expensesService.delete(expense.id)
      setMessage({ type: 'success', text: 'Expense deleted successfully!' })
      fetchExpenses()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error deleting expense:', error)
      setMessage({ type: 'error', text: 'Error deleting expense. Please try again.' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const expenseCategories = ['all', ...Array.from(new Set(expenses.map(exp => exp.category)))]
  
  const filteredExpenses = expenses.filter(expense => 
    filter === 'all' || expense.category === filter
  )

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Stock Purchase': 'bg-blue-100 text-blue-800',
      'Packaging': 'bg-green-100 text-green-800',
      'Printing': 'bg-purple-100 text-purple-800',
      'Shipping': 'bg-yellow-100 text-yellow-800',
      'PayPal Fees': 'bg-red-100 text-red-800',
      'Marketing': 'bg-pink-100 text-pink-800',
      'Office Supplies': 'bg-indigo-100 text-indigo-800',
      'Other': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">Loading expenses...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
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

        {/* Add Expense Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="e.g., 100 poly mailers from Amazon"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={saving}
                >
                  <Plus className="w-4 h-4" />
                  {saving ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses ({filter === 'all' ? 'All Categories' : filter})</p>
              <p className="text-3xl font-bold text-gray-900">€{totalExpenses.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            {expenseCategories.map(category => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  filter === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category} {category !== 'all' && `(${expenses.filter(e => e.category === category).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' ? 'No expenses recorded yet.' : `No expenses in ${filter} category.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
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
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                          <Tag className="w-3 h-3 mr-1" />
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {expense.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        €{expense.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(expense)}
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

        {/* Category Breakdown */}
        {filteredExpenses.length > 0 && filter === 'all' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => {
                const categoryExpenses = expenses.filter(e => e.category === category)
                const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0)
                
                if (categoryTotal === 0) return null
                
                return (
                  <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium text-gray-700">{category}:</span>
                    <span className="text-sm font-bold text-gray-900">€{categoryTotal.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Edit Expense Modal */}
        <EditExpenseModal
          expense={editingExpense}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingExpense(null)
          }}
          onSave={fetchExpenses}
        />
      </div>
    </Layout>
  )
}

export default ExpensesPage
