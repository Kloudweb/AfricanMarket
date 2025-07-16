
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  RefreshCw,
  Download,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentUtils } from '@/lib/payment-utils';
import { format, subDays } from 'date-fns';

interface PaymentAnalyticsData {
  status: string;
  paymentProvider: string;
  _count: {
    id: number;
  };
  _sum: {
    amount: number;
    platformFee: number;
  };
}

interface PaymentAnalyticsProps {
  className?: string;
}

export default function PaymentAnalytics({ className }: PaymentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<PaymentAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  useEffect(() => {
    if (dateRange === '7d') {
      setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    } else if (dateRange === '30d') {
      setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    } else if (dateRange === '90d') {
      setStartDate(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(`/api/payments/analytics?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data.analytics);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch analytics',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast({
      title: 'Export Started',
      description: 'Your analytics report is being prepared',
    });
  };

  // Calculate summary metrics
  const totalTransactions = analytics.reduce(
    (sum, item) => sum + item._count.id,
    0
  );
  const totalAmount = analytics.reduce(
    (sum, item) => sum + (item._sum.amount || 0),
    0
  );
  const totalFees = analytics.reduce(
    (sum, item) => sum + (item._sum.platformFee || 0),
    0
  );

  const successfulTransactions = analytics
    .filter(item => item.status === 'COMPLETED')
    .reduce((sum, item) => sum + item._count.id, 0);

  const successRate = totalTransactions > 0 
    ? (successfulTransactions / totalTransactions) * 100 
    : 0;

  // Prepare chart data
  const statusData = analytics.map(item => ({
    name: item.status,
    value: item._count.id,
    amount: item._sum.amount || 0,
  }));

  const providerData = analytics.reduce((acc, item) => {
    const existing = acc.find(p => p.name === item.paymentProvider);
    if (existing) {
      existing.value += item._count.id;
      existing.amount += item._sum.amount || 0;
    } else {
      acc.push({
        name: item.paymentProvider,
        value: item._count.id,
        amount: item._sum.amount || 0,
      });
    }
    return acc;
  }, [] as { name: string; value: number; amount: number }[]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Payment Analytics
            </CardTitle>
            <CardDescription>
              Monitor payment performance and trends
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[120px]">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold">
                      {PaymentUtils.formatCurrency(totalAmount)}
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
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Platform Fees</p>
                    <p className="text-2xl font-bold">
                      {PaymentUtils.formatCurrency(totalFees)}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Status</CardTitle>
                <CardDescription>
                  Distribution of payment statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Provider Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Providers</CardTitle>
                <CardDescription>
                  Transaction volume by provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
              <CardDescription>
                Payment analytics by status and provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="secondary"
                            className={PaymentUtils.getPaymentStatusColor(item.status as any)}
                          >
                            {item.status}
                          </Badge>
                          <Badge variant="outline">
                            {item.paymentProvider}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {item._count.id} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {PaymentUtils.formatCurrency(item._sum.amount || 0)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Fees: {PaymentUtils.formatCurrency(item._sum.platformFee || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
