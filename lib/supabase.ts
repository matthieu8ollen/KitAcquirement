import { createClient } from '@supabase/supabase-js'
import { InventoryItem, Sale, Expense } from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper functions for common operations
export const inventoryService = {
  // Get all inventory items
  async getAll() {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Update inventory status
  async updateStatus(id: string, status: 'In Stock' | 'Listed' | 'Sold') {
    const { data, error } = await supabase
      .from('inventory')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data
  },

  // Add new inventory item
  async create(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('inventory')
      .insert(item)
      .select()
    
    if (error) throw error
    return data
  }
}

export const salesService = {
  // Get all sales with inventory details
  async getAll() {
    const { data, error } = await supabase
      .from('sales')
      .select('*, inventory(*)')
      .order('sale_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Create new sale
  async create(sale: Omit<Sale, 'id' | 'profit' | 'created_at'>) {
    const { data, error } = await supabase
      .from('sales')
      .insert(sale)
      .select()
    
    if (error) throw error
    return data
  }
}

export const expensesService = {
  // Get all expenses
  async getAll() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Add new expense
  async create(expense: Omit<Expense, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
      .select()
    
    if (error) throw error
    return data
  }
}
