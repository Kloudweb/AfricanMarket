
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  Plus, 
  Minus, 
  ArrowUpDown, 
  Eye, 
  EyeOff,
  CreditCard,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentUtils } from '@/lib/payment-utils';
import { format } from 'date-fns';

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: string;
  createdAt: string;
}

interface DigitalWalletData {
  id: string;
  userId: string;
  type: string;
  balance: number;
  currency: string;
  isActive: boolean;
  isFrozen: boolean;
  transactions: WalletTransaction[];
  createdAt: string;
}

interface DigitalWalletProps {
  className?: string;
}

export default function DigitalWallet({ className }: DigitalWalletProps) {
  const [wallet, setWallet] = useState<DigitalWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await fetch('/api/payments/digital-wallet');
      const data = await response.json();
      
      if (response.ok) {
        setWallet(data.wallet);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch wallet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch wallet',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processTransaction = async (type: 'credit' | 'debit') => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/payments/digital-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          description: description || (type === 'credit' ? 'Add funds' : 'Withdraw funds'),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${type === 'credit' ? 'Funds added' : 'Funds withdrawn'} successfully`,
        });
        await fetchWallet();
        setAmount('');
        setDescription('');
        setShowAddFunds(false);
        setShowWithdraw(false);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Transaction failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      default:
        return <Wallet className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      case 'transfer':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Digital Wallet
          </CardTitle>
          <CardDescription>Loading wallet...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Digital Wallet
          </CardTitle>
          <CardDescription>Wallet not found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Digital Wallet
            </CardTitle>
            <CardDescription>
              Manage your digital wallet balance
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Wallet Balance */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Available Balance</p>
                <p className="text-2xl font-bold mt-1">
                  {showBalance 
                    ? PaymentUtils.formatCurrency(wallet.balance, wallet.currency)
                    : '••••••'
                  }
                </p>
              </div>
              <div className="text-right">
                <Badge 
                  variant="secondary" 
                  className={`${
                    wallet.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {wallet.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {wallet.isFrozen && (
                  <Badge variant="destructive" className="ml-2">
                    Frozen
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => {
                setShowAddFunds(true);
                setShowWithdraw(false);
              }}
              className="flex items-center justify-center h-12"
              disabled={!wallet.isActive || wallet.isFrozen}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowWithdraw(true);
                setShowAddFunds(false);
              }}
              className="flex items-center justify-center h-12"
              disabled={!wallet.isActive || wallet.isFrozen || wallet.balance <= 0}
            >
              <Minus className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </div>

          {/* Add Funds Form */}
          {showAddFunds && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Funds</CardTitle>
                <CardDescription>
                  Add money to your digital wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addAmount">Amount</Label>
                    <Input
                      id="addAmount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addDescription">Description (Optional)</Label>
                    <Input
                      id="addDescription"
                      placeholder="Add funds to wallet"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setShowAddFunds(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => processTransaction('credit')}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? 'Processing...' : 'Add Funds'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Withdraw Form */}
          {showWithdraw && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Withdraw Funds</CardTitle>
                <CardDescription>
                  Withdraw money from your digital wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="withdrawAmount">Amount</Label>
                    <Input
                      id="withdrawAmount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1"
                      max={wallet.balance}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {PaymentUtils.formatCurrency(wallet.balance, wallet.currency)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="withdrawDescription">Description (Optional)</Label>
                    <Input
                      id="withdrawDescription"
                      placeholder="Withdraw funds"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setShowWithdraw(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => processTransaction('debit')}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? 'Processing...' : 'Withdraw'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <div>
            <h3 className="font-medium mb-3">Recent Transactions</h3>
            {wallet.transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {wallet.transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium text-sm ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'debit' ? '-' : '+'}
                        {PaymentUtils.formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Balance: {PaymentUtils.formatCurrency(transaction.balanceAfter, transaction.currency)}
                      </p>
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
