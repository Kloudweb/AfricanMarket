
'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Smartphone, 
  DollarSign, 
  Shield 
} from 'lucide-react'

interface PaymentMethodSelectorProps {
  selectedMethod: string
  onMethodSelect: (method: string) => void
}

export function PaymentMethodSelector({ selectedMethod, onMethodSelect }: PaymentMethodSelectorProps) {
  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, American Express',
      icon: <CreditCard className="h-5 w-5" />,
      recommended: true
    },
    {
      id: 'digital',
      name: 'Digital Payment',
      description: 'PayPal, Apple Pay, Google Pay',
      icon: <Smartphone className="h-5 w-5" />,
      recommended: false
    },
    {
      id: 'cash',
      name: 'Cash on Delivery',
      description: 'Pay with cash when your order arrives',
      icon: <DollarSign className="h-5 w-5" />,
      recommended: false
    }
  ]

  return (
    <RadioGroup value={selectedMethod} onValueChange={onMethodSelect}>
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <div key={method.id} className="flex items-start space-x-3">
            <RadioGroupItem value={method.id} id={method.id} className="mt-4" />
            <Label htmlFor={method.id} className="flex-1 cursor-pointer">
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-600">
                        {method.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{method.name}</p>
                          {method.recommended && (
                            <Badge variant="secondary" className="text-xs">Recommended</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </div>
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  )
}
