import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  account_type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parent: z.number().nullable(),
  is_active: z.boolean(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.number().min(1, 'Category is required'),
  unit_price: z.number().min(0, 'Price must be positive'),
  quantity_in_stock: z.number().min(0, 'Stock must be positive'),
  is_active: z.boolean(),
})

export const orderSchema = z.object({
  order_number: z.string().min(1, 'Order number is required'),
  customer: z.number().min(1, 'Customer is required'),
  total_amount: z.number().min(0, 'Amount must be positive'),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
})

export const invoiceSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  customer: z.number().min(1, 'Customer is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'cancelled']),
  due_date: z.string().min(1, 'Due date is required'),
})

export const tenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric'),
  domain: z.string().min(1, 'Domain is required'),
  is_active: z.boolean(),
})

export const employeeSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  user: z.number().min(1, 'User is required'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  date_of_joining: z.string().min(1, 'Join date is required'),
  salary: z.number().min(0, 'Salary must be positive'),
  is_active: z.boolean(),
})

export const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  document_type: z.enum(['pdf', 'image', 'spreadsheet', 'document', 'code', 'other']),
  category: z.string().min(1, 'Category is required'),
  is_public: z.boolean(),
})

export type AccountFormData = z.infer<typeof accountSchema>
export type ProductFormData = z.infer<typeof productSchema>
export type OrderFormData = z.infer<typeof orderSchema>
export type InvoiceFormData = z.infer<typeof invoiceSchema>
export type TenantFormData = z.infer<typeof tenantSchema>
export type EmployeeFormData = z.infer<typeof employeeSchema>
export type DocumentFormData = z.infer<typeof documentSchema>