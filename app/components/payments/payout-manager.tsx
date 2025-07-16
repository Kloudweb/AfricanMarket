
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Banknote, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  DollarSign,
  CreditCard,
  Settings,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentUtils } from '@/lib/payment-utils';
import { format } from 'date-fns';
import { PayoutStatus, PayoutFrequency } from '@/lib/types';

interface PayoutData {
  id: string;
  payoutNumber: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  grossAmount: number;
  fees: number;
  netAmount: number;
  scheduledFor?: string;
  processedAt?: string;
  arrivedAt?: string;
  failedAt?: string;
  periodStart: string;
  periodEnd: string;
  description?: string;
  createdAt: string;
}

interface PayoutSchedule {
  id: string;
  frequency: PayoutFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  minimumAmount: number;
  isActive: boolean;
  autoPayoutEnabled: boolean;
  nextPayoutAt?: string;
}

interface PayoutManagerProps {
  className?: string;
}

export default function PayoutManager({ className }: PayoutManagerProps) {
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [schedule, setSchedule] = useState<PayoutSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showManualPayout, setShowManualPayout] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPayouts();
    fetchSchedule();
  }, []);

  const fetchPayouts = async () => {
    try {
      // TODO: Implement payout fetching API
      // const response = await fetch('/api/payments/payouts');
      // const data = await response.json();
      // setPayouts(data.payouts);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch payouts',
        variant: 'destructive',
      });
    }
  };

  const fetchSchedule = async () => {
    try {
      // TODO: Implement schedule fetching API
      // const response = await fetch('/api/payments/payout-schedule');
      // const data = await response.json();
      // setSchedule(data.schedule);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch payout schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestManualPayout = async () => {
    if (!manualAmount || parseFloat(manualAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/payments/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(manualAmount),
          description: manualDescription || 'Manual payout request',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Payout Requested',
          description: 'Your payout request has been submitted',
        });
        await fetchPayouts();
        setManualAmount('');
        setManualDescription('');
        setShowManualPayout(false);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to request payout',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to request payout',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: PayoutStatus) => {
    switch (status) {
      case PayoutStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case PayoutStatus.PROCESSING:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case PayoutStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case PayoutStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PayoutStatus) => {
    return PaymentUtils.getPayoutStatusColor(status);
  };

  const calculateEarnings = () => {
    // Mock earnings calculation - in real app, this would come from API
    return {
      pendingEarnings: 245.50,
      availableForPayout: 200.00,
      totalEarnings: 1250.75,
      thisMonth: 450.25,
    };
  };

  const earnings = calculateEarnings();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Banknote className="h-5 w-5 mr-2" />
            Payout Manager
          </CardTitle>
          <CardDescription>Loading payout information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Banknote className="h-5 w-5 mr-2" />
          Payout Manager
        </CardTitle>
        <CardDescription>
          Manage your earnings and payout schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Earnings Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available</p>
                    <p className="text-2xl font-bold text-green-600">
                      {PaymentUtils.formatCurrency(earnings.availableForPayout)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {PaymentUtils.formatCurrency(earnings.pendingEarnings)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {PaymentUtils.formatCurrency(earnings.thisMonth)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {PaymentUtils.formatCurrency(earnings.totalEarnings)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payout Actions */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setShowManualPayout(true)}
              disabled={earnings.availableForPayout <= 0}
            >
              <Banknote className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowScheduleForm(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Schedule Settings
            </Button>
          </div>

          {/* Manual Payout Form */}
          {showManualPayout && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Manual Payout</CardTitle>
                <CardDescription>
                  Request an immediate payout of your available earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="mt-1"
                      max={earnings.availableForPayout}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {PaymentUtils.formatCurrency(earnings.availableForPayout)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Manual payout request"
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Processing Fee:</strong> 2% of payout amount
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Estimated Arrival:</strong> 1-2 business days
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setShowManualPayout(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={requestManualPayout}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? 'Processing...' : 'Request Payout'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payout Schedule */}
          {schedule && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payout Schedule</CardTitle>
                <CardDescription>
                  Your automatic payout settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Frequency</span>
                    <Badge variant="secondary">{schedule.frequency}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Minimum Amount</span>
                    <span className="text-sm">{PaymentUtils.formatCurrency(schedule.minimumAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Auto Payout</span>
                    <Badge variant={schedule.autoPayoutEnabled ? "default" : "secondary"}>
                      {schedule.autoPayoutEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  {schedule.nextPayoutAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Next Payout</span>
                      <span className="text-sm">
                        {format(new Date(schedule.nextPayoutAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Payouts */}
          <div>
            <h3 className="font-medium mb-4">Recent Payouts</h3>
            {payouts.length === 0 ? (
              <p className="text-gray-500 text-sm">No payouts yet</p>
            ) : (
              <div className="space-y-4">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(payout.status)}
                      <div>
                        <p className="font-medium">{payout.payoutNumber}</p>
                        <p className="text-sm text-gray-600">{payout.description}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(payout.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {PaymentUtils.formatCurrency(payout.netAmount, payout.currency)}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(payout.status)}
                      >
                        {payout.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
