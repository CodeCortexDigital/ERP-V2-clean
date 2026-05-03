export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  date_joined: string
  last_login: string | null
}

export interface Tenant {
  id: number
  name: string
  slug: string
  domain: string
  is_active: boolean
  created_at: string
}

export interface Account {
  id: number
  name: string
  code: string
  account_type: string
  parent: number | null
  is_active: boolean
  balance: number
}

export interface Product {
  id: number
  name: string
  sku: string
  category: number
  unit_price: number
  quantity_in_stock: number
  is_active: boolean
}

export interface Order {
  id: number
  order_number: string
  customer: number
  total_amount: number
  status: string
  created_at: string
}

export interface Invoice {
  id: number
  invoice_number: string
  customer: number
  amount: number
  status: string
  due_date: string
  created_at: string
}