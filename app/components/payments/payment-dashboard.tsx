
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Wallet, 
  Receipt, 
  Star, 
  TrendingUp, 
  Settings,
  DollarSign
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import PaymentMethodManager from './payment-method-manager';
import PaymentForm from './payment-form';
import TransactionHistory from './transaction-history';
import DigitalWallet from './digital-wallet';
import LoyaltyPoints from './loyalty-points';
import PaymentAnalytics from './payment-analytics';

interface PaymentDashboardProps {
  className?: string;
}

export default function PaymentDashboard({ className }: PaymentDashboardProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');

  const isAdmin = session?.user?.role === 'ADMIN';
  const isVendor = session?.user?.role === 'VENDOR';
  const isDriver = session?.user?.role === 'DRIVER';

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Dashboard</h1>
        <p className="text-gray-600">
          Manage your payments, transactions, and financial activities
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="methods" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Methods
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center">
            <Receipt className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center">
            <Wallet className="h-4 w-4 mr-2" />
            Wallet
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Loyalty
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="analytics" className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DigitalWallet />
            <LoyaltyPoints />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Manage your saved payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Methods</span>
                    <Badge variant="secondary">3</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Default Method</span>
                    <span className="text-sm text-gray-500">•••• 4242</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab('methods')}
                  >
                    Manage Methods
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">This Month</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Spent</span>
                    <span className="text-sm font-medium">$247.50</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab('transactions')}
                  >
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common payment tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Wallet className="h-4 w-4 mr-2" />
                    Add Wallet Funds
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Receipt className="h-4 w-4 mr-2" />
                    Download Receipts
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="methods">
          <PaymentMethodManager />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionHistory />
        </TabsContent>

        <TabsContent value="wallet">
          <DigitalWallet />
        </TabsContent>

        <TabsContent value="loyalty">
          <LoyaltyPoints />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="analytics">
            <PaymentAnalytics />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
