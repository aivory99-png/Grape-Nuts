export type UserRole = 'admin' | 'seller' | 'viewer'
export type ClientType = 'wine_shop' | 'bar' | 'restaurant' | 'supermarket' | 'distributor' | 'prospect'
export type WineType = 'tinto' | 'branco' | 'rose' | 'espumante' | 'outro'
export type StorageLocation = 'casa_paulo' | 'casa_otto' | 'outro'
export type PaymentType = 'faturado' | 'sem_nota' | 'consignado'
export type PaymentTerm = 'avista' | '30_dias' | '60_dias'
export type OrderStatus = 'open' | 'partial' | 'paid' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'overdue'
export type AIProvider = 'groq' | 'google' | 'anthropic' | 'openai'

export interface Winery {
  id: string
  name: string
  country: string | null
  region: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  created_at: string
}

export interface Wine {
  id: string
  winery_id: string | null
  name: string
  vintage: number | null
  type: WineType
  sku: string | null
  description: string | null
  active: boolean
  created_at: string
  wineries?: Winery
}

export interface StockEntry {
  id: string
  wine_id: string | null
  winery_id: string | null
  qty_purchased: number
  qty_remaining: number
  purchase_price: number
  list_price: number | null
  discount_amount: number
  discount_pct: number
  discount_notes: string | null
  storage_location: StorageLocation
  purchase_date: string
  notes: string | null
  created_at: string
  wines?: Wine
  wineries?: Winery
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  permissions: Record<string, unknown>
  active: boolean
  created_at: string
}

export interface Client {
  id: string
  responsible_id: string | null
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  type: ClientType
  city: string | null
  state: string | null
  neighborhood: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
  user_profiles?: UserProfile
}

export interface OrderItem {
  id: string
  order_id: string
  wine_id: string | null
  stock_entry_id: string | null
  quantity: number
  purchase_price: number
  sale_price: number
  created_at: string
  wines?: Wine
}

export interface Delivery {
  id: string
  order_id: string
  company_name: string | null
  price: number
  paid: boolean
  paid_date: string | null
  tracking_code: string | null
  notes: string | null
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  due_date: string
  paid_at: string | null
  status: PaymentStatus
  notes: string | null
  created_at: string
}

export interface Order {
  id: string
  client_id: string | null
  seller_id: string | null
  order_date: string
  status: OrderStatus
  payment_type: PaymentType
  payment_term: PaymentTerm
  due_date: string | null
  total_cost: number
  total_revenue: number
  notes: string | null
  created_at: string
  updated_at: string
  clients?: Client
  user_profiles?: UserProfile
  order_items?: OrderItem[]
  payments?: Payment[]
  deliveries?: Delivery[]
}

export interface AISettings {
  id: string
  created_by: string | null
  provider: AIProvider
  api_key_encrypted: string | null
  model: string | null
  active: boolean
  created_at: string
  updated_at: string
}
