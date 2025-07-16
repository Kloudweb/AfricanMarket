
'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Types
interface CartItem {
  id: string
  productId: string
  vendorId: string
  quantity: number
  price: number
  subtotal: number
  notes?: string
  product: {
    id: string
    name: string
    description?: string
    image?: string
    price: number
    vendor: {
      id: string
      businessName: string
      logo?: string
      deliveryFee?: number
      minimumOrderAmount?: number
      address: string
      city: string
      province: string
    }
  }
}

interface VendorGroup {
  vendor: {
    id: string
    businessName: string
    logo?: string
    deliveryFee?: number
    minimumOrderAmount?: number
    address: string
    city: string
    province: string
  }
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  minimumOrderAmount: number
}

interface CartState {
  items: CartItem[]
  subtotal: number
  tax: number
  deliveryFee: number
  total: number
  discountAmount: number
  appliedPromoCode?: string
  isDelivery: boolean
  deliveryAddress?: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  specialInstructions?: string
  itemCount: number
  vendorGroups: VendorGroup[]
  loading: boolean
  error?: string
}

interface CartContextType {
  state: CartState
  addItem: (productId: string, quantity?: number, notes?: string) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateItem: (itemId: string, quantity: number, notes?: string) => Promise<void>
  clearCart: () => Promise<void>
  applyPromoCode: (code: string) => Promise<void>
  removePromoCode: () => Promise<void>
  updateDeliverySettings: (settings: {
    isDelivery?: boolean
    deliveryAddress?: string
    deliveryLatitude?: number
    deliveryLongitude?: number
    specialInstructions?: string
  }) => Promise<void>
  refreshCart: () => Promise<void>
  getVendorSubtotal: (vendorId: string) => number
  getVendorItemCount: (vendorId: string) => number
}

// Initial state
const initialState: CartState = {
  items: [],
  subtotal: 0,
  tax: 0,
  deliveryFee: 0,
  total: 0,
  discountAmount: 0,
  isDelivery: true,
  itemCount: 0,
  vendorGroups: [],
  loading: false
}

// Action types
type CartAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_CART'; payload: Partial<CartState> }
  | { type: 'CLEAR_CART' }
  | { type: 'SYNC_FROM_API'; payload: any }

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    
    case 'SET_CART':
      return { ...state, ...action.payload, loading: false, error: undefined }
    
    case 'CLEAR_CART':
      return { ...initialState }
    
    case 'SYNC_FROM_API':
      const apiData = action.payload
      return {
        ...state,
        items: apiData.items || [],
        subtotal: apiData.subtotal || 0,
        tax: apiData.tax || 0,
        deliveryFee: apiData.deliveryFee || 0,
        total: apiData.total || 0,
        discountAmount: apiData.discountAmount || 0,
        appliedPromoCode: apiData.appliedPromoCode,
        isDelivery: apiData.isDelivery ?? true,
        deliveryAddress: apiData.deliveryAddress,
        deliveryLatitude: apiData.deliveryLatitude,
        deliveryLongitude: apiData.deliveryLongitude,
        specialInstructions: apiData.specialInstructions,
        itemCount: apiData.itemCount || 0,
        vendorGroups: apiData.vendorGroups || [],
        loading: false,
        error: undefined
      }
    
    default:
      return state
  }
}

// Context
const CartContext = createContext<CartContextType | undefined>(undefined)

// Provider
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { data: session } = useSession()

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !session) {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart)
          dispatch({ type: 'SET_CART', payload: parsedCart })
        } catch (error) {
          console.error('Error parsing saved cart:', error)
        }
      }
    }
  }, [session])

  // Sync cart from API when user logs in
  useEffect(() => {
    if (session?.user?.id) {
      refreshCart()
    }
  }, [session?.user?.id])

  // Save cart to localStorage when state changes (for non-logged-in users)
  useEffect(() => {
    if (typeof window !== 'undefined' && !session) {
      localStorage.setItem('cart', JSON.stringify(state))
    }
  }, [state, session])

  const refreshCart = async () => {
    if (!session?.user?.id) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch('/api/cart')
      
      if (response.ok) {
        const cartData = await response.json()
        dispatch({ type: 'SYNC_FROM_API', payload: cartData })
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart' })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
    }
  }

  const addItem = async (productId: string, quantity = 1, notes?: string) => {
    if (!session?.user?.id) {
      toast.error('Please sign in to add items to cart')
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity, notes }),
      })

      if (response.ok) {
        const updatedCart = await response.json()
        dispatch({ type: 'SYNC_FROM_API', payload: updatedCart })
        toast.success('Item added to cart')
      } else {
        const errorData = await response.json()
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        toast.error(errorData.error || 'Failed to add item to cart')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
      toast.error('Failed to add item to cart')
    }
  }

  const removeItem = async (itemId: string) => {
    if (!session?.user?.id) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const updatedCart = await response.json()
        dispatch({ type: 'SYNC_FROM_API', payload: updatedCart })
        toast.success('Item removed from cart')
      } else {
        const errorData = await response.json()
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        toast.error(errorData.error || 'Failed to remove item')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
      toast.error('Failed to remove item')
    }
  }

  const updateItem = async (itemId: string, quantity: number, notes?: string) => {
    if (!session?.user?.id) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity, notes }),
      })

      if (response.ok) {
        const updatedCart = await response.json()
        dispatch({ type: 'SYNC_FROM_API', payload: updatedCart })
      } else {
        const errorData = await response.json()
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        toast.error(errorData.error || 'Failed to update item')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
      toast.error('Failed to update item')
    }
  }

  const clearCart = async () => {
    if (!session?.user?.id) {
      dispatch({ type: 'CLEAR_CART' })
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch('/api/cart', {
        method: 'DELETE',
      })

      if (response.ok) {
        dispatch({ type: 'CLEAR_CART' })
        toast.success('Cart cleared')
      } else {
        const errorData = await response.json()
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        toast.error(errorData.error || 'Failed to clear cart')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
      toast.error('Failed to clear cart')
    }
  }

  const applyPromoCode = async (code: string) => {
    if (!session?.user?.id) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch('/api/cart/promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (response.ok) {
        const result = await response.json()
        dispatch({ type: 'SYNC_FROM_API', payload: result.cart })
        toast.success(`Promo code applied! You saved $${result.discount.toFixed(2)}`)
      } else {
        const errorData = await response.json()
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        toast.error(errorData.error || 'Failed to apply promo code')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
      toast.error('Failed to apply promo code')
    }
  }

  const removePromoCode = async () => {
    if (!session?.user?.id) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch('/api/cart/promo', {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        dispatch({ type: 'SYNC_FROM_API', payload: result.cart })
        toast.success('Promo code removed')
      } else {
        const errorData = await response.json()
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        toast.error(errorData.error || 'Failed to remove promo code')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
      toast.error('Failed to remove promo code')
    }
  }

  const updateDeliverySettings = async (settings: {
    isDelivery?: boolean
    deliveryAddress?: string
    deliveryLatitude?: number
    deliveryLongitude?: number
    specialInstructions?: string
  }) => {
    if (!session?.user?.id) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        const updatedCart = await response.json()
        dispatch({ type: 'SYNC_FROM_API', payload: updatedCart })
      } else {
        const errorData = await response.json()
        dispatch({ type: 'SET_ERROR', payload: errorData.error })
        toast.error(errorData.error || 'Failed to update delivery settings')
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error' })
      toast.error('Failed to update delivery settings')
    }
  }

  const getVendorSubtotal = (vendorId: string) => {
    return state.items
      .filter(item => item.vendorId === vendorId)
      .reduce((sum, item) => sum + item.subtotal, 0)
  }

  const getVendorItemCount = (vendorId: string) => {
    return state.items
      .filter(item => item.vendorId === vendorId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
    updateDeliverySettings,
    refreshCart,
    getVendorSubtotal,
    getVendorItemCount
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// Hook
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

// Hook for vendor-specific cart data
export function useVendorCart(vendorId: string) {
  const { state, getVendorSubtotal, getVendorItemCount } = useCart()
  
  const vendorItems = state.items.filter(item => item.vendorId === vendorId)
  const vendorGroup = state.vendorGroups.find(group => group.vendor.id === vendorId)
  
  return {
    items: vendorItems,
    subtotal: getVendorSubtotal(vendorId),
    itemCount: getVendorItemCount(vendorId),
    vendor: vendorGroup?.vendor,
    deliveryFee: vendorGroup?.deliveryFee || 0,
    minimumOrderAmount: vendorGroup?.minimumOrderAmount || 0
  }
}

// Hook for checking if product is in cart
export function useProductInCart(productId: string) {
  const { state } = useCart()
  
  const cartItem = state.items.find(item => item.productId === productId)
  
  return {
    isInCart: !!cartItem,
    quantity: cartItem?.quantity || 0,
    cartItem
  }
}
