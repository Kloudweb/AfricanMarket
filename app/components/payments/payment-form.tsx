
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentUtils } from '@/lib/payment-utils';
import PaymentMethodManager from './payment-method-manager';

interface PaymentFormData {
  amount: number;
  description?: string;
  orderId?: string;
  rideId?: string;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}

interface PaymentFormProps {
  amount: number;
  currency?: string;
  orderId?: string;
  rideId?: string;
  description?: string;
  onPaymentComplete?: (result: any) => void;
  onPaymentError?: (error: any) => void;
}

export default function PaymentForm({
  amount,
  currency = 'CAD',
  orderId,
  rideId,
  description,
  onPaymentComplete,
  onPaymentError
}: PaymentFormProps) {
  const [processing, setProcessing] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PaymentFormData>();

  const watchAmount = watch('amount', amount);

  const calculation = PaymentUtils.calculatePaymentBreakdown(
    watchAmount,
    0.15, // 15% tax
    orderId ? 5.00 : 0, // $5 delivery fee for orders
    0 // No tips in this form
  );

  const processPayment = async (data: PaymentFormData) => {
    setProcessing(true);
    try {
      // Create payment intent
      const intentResponse = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: calculation.total,
          currency,
          orderId,
          rideId,
          paymentMethodId: selectedMethodId,
          description: description || data.description,
        }),
      });

      const intentData = await intentResponse.json();

      if (!intentResponse.ok) {
        throw new Error(intentData.error || 'Failed to create payment intent');
      }

      // Confirm payment
      const confirmResponse = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: intentData.paymentId,
          paymentMethodId: selectedMethodId,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmData.error || 'Failed to confirm payment');
      }

      if (confirmData.status === 'succeeded') {
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been processed successfully',
        });
        onPaymentComplete?.(confirmData);
      } else if (confirmData.requiresAction) {
        // Handle 3D Secure or other actions
        toast({
          title: 'Action Required',
          description: 'Please complete the additional verification',
          variant: 'destructive',
        });
      } else {
        throw new Error('Payment failed');
      }
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'An error occurred during payment',
        variant: 'destructive',
      });
      onPaymentError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleMethodSelect = (method: any) => {
    setSelectedMethodId(method.id);
    setShowAddMethod(false);
  };

  if (showAddMethod) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Payment Method</CardTitle>
          <CardDescription>
            Add a new payment method to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nickname">Nickname (Optional)</Label>
              <Input
                id="nickname"
                placeholder="Work Card"
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="setDefault" />
              <Label htmlFor="setDefault">Set as default payment method</Label>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => setShowAddMethod(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button className="flex-1">
                Add Payment Method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PaymentMethodManager
        onAddMethod={() => setShowAddMethod(true)}
        onSelectMethod={handleMethodSelect}
        selectedMethodId={selectedMethodId || undefined}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Review your payment information before proceeding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(processPayment)} className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{PaymentUtils.formatCurrency(calculation.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span>{PaymentUtils.formatCurrency(calculation.tax, currency)}</span>
                </div>
                {orderId && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{PaymentUtils.formatCurrency(5.00, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Processing Fee</span>
                  <span>{PaymentUtils.formatCurrency(calculation.processingFee, currency)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{PaymentUtils.formatCurrency(calculation.total, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            {!selectedMethodId && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Payment Method Required
                    </p>
                    <p className="text-sm text-yellow-700">
                      Please select a payment method or add a new one to continue.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <Lock className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Secure Payment
                  </p>
                  <p className="text-sm text-blue-700">
                    Your payment information is encrypted and secure. We never store your card details.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={processing || !selectedMethodId}
              >
                {processing ? 'Processing...' : `Pay ${PaymentUtils.formatCurrency(calculation.total, currency)}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
