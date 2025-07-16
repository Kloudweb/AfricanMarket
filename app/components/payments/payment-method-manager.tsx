
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CreditCard, Trash2, Star, StarOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentMethodType, PaymentProvider } from '@/lib/types';
import { PaymentUtils } from '@/lib/payment-utils';

interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  last4?: string;
  brand?: string;
  nickname?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaymentMethodManagerProps {
  onAddMethod?: () => void;
  onSelectMethod?: (method: PaymentMethod) => void;
  selectedMethodId?: string;
  showAddButton?: boolean;
}

export default function PaymentMethodManager({
  onAddMethod,
  onSelectMethod,
  selectedMethodId,
  showAddButton = true
}: PaymentMethodManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/methods');
      const data = await response.json();
      
      if (response.ok) {
        setPaymentMethods(data.paymentMethods);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch payment methods',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch payment methods',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setDefaultMethod = async (methodId: string) => {
    setProcessing(methodId);
    try {
      const response = await fetch(`/api/payments/methods/${methodId}/default`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchPaymentMethods();
        toast({
          title: 'Success',
          description: 'Default payment method updated',
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to update default payment method',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update default payment method',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case PaymentMethodType.CREDIT_CARD:
      case PaymentMethodType.DEBIT_CARD:
        return <CreditCard className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getProviderBadgeColor = (provider: PaymentProvider) => {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return 'bg-blue-100 text-blue-800';
      case PaymentProvider.SQUARE:
        return 'bg-green-100 text-green-800';
      case PaymentProvider.PAYPAL:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Loading payment methods...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Manage your saved payment methods
            </CardDescription>
          </div>
          {showAddButton && (
            <Button onClick={onAddMethod} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Method
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No payment methods found</p>
            <p className="text-sm">Add a payment method to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${
                  selectedMethodId === method.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => onSelectMethod?.(method)}
              >
                <div className="flex items-center space-x-3">
                  {getPaymentMethodIcon(method.type)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {PaymentUtils.formatPaymentMethodDisplay(
                          method.type,
                          method.last4,
                          method.brand
                        )}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getProviderBadgeColor(method.provider)}`}
                      >
                        {method.provider}
                      </Badge>
                      {method.nickname && (
                        <span className="text-sm text-gray-500">
                          {method.nickname}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefaultMethod(method.id);
                    }}
                    disabled={processing === method.id || method.isDefault}
                  >
                    {method.isDefault ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement delete method
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
