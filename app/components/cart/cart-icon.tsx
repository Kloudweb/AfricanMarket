
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart-context'
import { ShoppingCart } from 'lucide-react'

interface CartIconProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  showCount?: boolean
  onClick?: () => void
}

export function CartIcon({ 
  variant = 'outline', 
  size = 'sm', 
  className = '', 
  showCount = true,
  onClick 
}: CartIconProps) {
  const { state } = useCart()

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={`relative ${className}`}
      onClick={onClick}
    >
      <ShoppingCart className="h-4 w-4" />
      {showCount && state.itemCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {state.itemCount}
        </Badge>
      )}
    </Button>
  )
}
