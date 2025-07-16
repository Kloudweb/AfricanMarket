
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Gift, 
  Star, 
  TrendingUp, 
  Trophy, 
  Coins,
  Award,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface LoyaltyPointsHistory {
  id: string;
  type: string;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: string;
  orderId?: string;
  rideId?: string;
  createdAt: string;
}

interface LoyaltyPointsData {
  id: string;
  userId: string;
  points: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  tier: string;
  tierProgress: number;
  nextTierAt?: number;
  isActive: boolean;
  history: LoyaltyPointsHistory[];
  createdAt: string;
}

interface LoyaltyPointsProps {
  className?: string;
}

export default function LoyaltyPoints({ className }: LoyaltyPointsProps) {
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLoyaltyPoints();
  }, []);

  const fetchLoyaltyPoints = async () => {
    try {
      const response = await fetch('/api/payments/loyalty');
      const data = await response.json();
      
      if (response.ok) {
        setLoyaltyPoints(data.loyaltyPoints);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch loyalty points',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch loyalty points',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze':
        return 'bg-orange-100 text-orange-800';
      case 'silver':
        return 'bg-gray-100 text-gray-800';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'platinum':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze':
        return <Award className="h-5 w-5 text-orange-600" />;
      case 'silver':
        return <Star className="h-5 w-5 text-gray-600" />;
      case 'gold':
        return <Trophy className="h-5 w-5 text-yellow-600" />;
      case 'platinum':
        return <Trophy className="h-5 w-5 text-purple-600" />;
      default:
        return <Award className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'earned':
        return 'text-green-600';
      case 'spent':
        return 'text-red-600';
      case 'expired':
        return 'text-gray-600';
      case 'adjusted':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'earned':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'spent':
        return <Gift className="h-4 w-4 text-red-600" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-600" />;
      case 'adjusted':
        return <Coins className="h-4 w-4 text-blue-600" />;
      default:
        return <Coins className="h-4 w-4 text-gray-600" />;
    }
  };

  const calculateTierProgress = (points: number, tier: string, nextTierAt?: number) => {
    const tierThresholds = {
      bronze: 0,
      silver: 1000,
      gold: 2500,
      platinum: 5000,
    };

    const currentThreshold = tierThresholds[tier.toLowerCase() as keyof typeof tierThresholds] || 0;
    const nextThreshold = nextTierAt || tierThresholds.platinum;

    if (nextThreshold <= currentThreshold) return 100;

    const progress = Math.min(
      ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100,
      100
    );

    return Math.max(0, progress);
  };

  const getNextTierName = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze':
        return 'Silver';
      case 'silver':
        return 'Gold';
      case 'gold':
        return 'Platinum';
      case 'platinum':
        return 'Platinum';
      default:
        return 'Silver';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2" />
            Loyalty Points
          </CardTitle>
          <CardDescription>Loading loyalty points...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!loyaltyPoints) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2" />
            Loyalty Points
          </CardTitle>
          <CardDescription>Loyalty points not found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tierProgress = calculateTierProgress(
    loyaltyPoints.points,
    loyaltyPoints.tier,
    loyaltyPoints.nextTierAt
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Star className="h-5 w-5 mr-2" />
          Loyalty Points
        </CardTitle>
        <CardDescription>
          Earn points with every purchase and ride
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Points Balance */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Available Points</p>
                <p className="text-3xl font-bold mt-1 flex items-center">
                  <Coins className="h-8 w-8 mr-2" />
                  {loyaltyPoints.points.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <Badge className={`${getTierColor(loyaltyPoints.tier)} mb-2`}>
                  <div className="flex items-center">
                    {getTierIcon(loyaltyPoints.tier)}
                    <span className="ml-1 capitalize">{loyaltyPoints.tier}</span>
                  </div>
                </Badge>
                <p className="text-xs opacity-80">Your Tier</p>
              </div>
            </div>
          </div>

          {/* Tier Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Progress to {getNextTierName(loyaltyPoints.tier)}</h3>
              <span className="text-sm text-gray-500">
                {loyaltyPoints.nextTierAt ? 
                  `${loyaltyPoints.nextTierAt - loyaltyPoints.points} points to go` : 
                  'Max tier reached'
                }
              </span>
            </div>
            <Progress value={tierProgress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Current: {loyaltyPoints.points}</span>
              <span>
                Next: {loyaltyPoints.nextTierAt || loyaltyPoints.points}
              </span>
            </div>
          </div>

          {/* Lifetime Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Lifetime Earned</p>
                  <p className="text-2xl font-bold text-green-700">
                    {loyaltyPoints.lifetimeEarned.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Lifetime Spent</p>
                  <p className="text-2xl font-bold text-red-700">
                    {loyaltyPoints.lifetimeSpent.toLocaleString()}
                  </p>
                </div>
                <Gift className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* How to Earn Points */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3">How to Earn Points</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Order from restaurants</span>
                <span className="font-medium text-blue-900">1 point per $1 spent</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Book rideshare trips</span>
                <span className="font-medium text-blue-900">2 points per $1 spent</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Leave reviews</span>
                <span className="font-medium text-blue-900">25 points per review</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Recent Activity</h3>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {loyaltyPoints.history.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {loyaltyPoints.history.slice(0, 5).map((transaction) => (
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
                      <p className={`font-medium text-sm ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.points > 0 ? '+' : ''}
                        {transaction.points.toLocaleString()} pts
                      </p>
                      <p className="text-xs text-gray-500">
                        Balance: {transaction.balanceAfter.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Redeem Points */}
          <Button 
            className="w-full" 
            disabled={loyaltyPoints.points < 100}
          >
            <Gift className="h-4 w-4 mr-2" />
            Redeem Points
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
