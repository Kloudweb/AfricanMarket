
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  Clock,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  Star,
  Users,
  Package,
  DollarSign,
} from "lucide-react";

interface PerformanceMetricsProps {
  analytics: any;
}

export default function PerformanceMetrics({ analytics }: PerformanceMetricsProps) {
  const { overview } = analytics;

  const getPerformanceScore = () => {
    const factors = [
      { weight: 0.3, score: Math.min(overview.conversionRate / 10, 1) * 100 }, // Conversion rate
      { weight: 0.25, score: Math.min(overview.avgRating / 5, 1) * 100 }, // Rating
      { weight: 0.25, score: Math.min(overview.completedOrders / overview.totalOrders, 1) * 100 }, // Success rate
      { weight: 0.2, score: Math.min(overview.returningCustomers / overview.totalCustomers, 1) * 100 }, // Retention
    ];

    const totalScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
    return Math.round(totalScore);
  };

  const performanceScore = getPerformanceScore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  const recommendations = [
    {
      condition: overview.conversionRate < 5,
      message: "Consider optimizing your menu presentation and pricing to improve conversion rates",
      icon: Target,
      type: "warning"
    },
    {
      condition: overview.avgRating < 4.0,
      message: "Focus on improving food quality and service to increase customer ratings",
      icon: Star,
      type: "error"
    },
    {
      condition: overview.returningCustomers / overview.totalCustomers < 0.3,
      message: "Implement loyalty programs to increase customer retention",
      icon: Users,
      type: "warning"
    },
    {
      condition: overview.activeProducts < 10,
      message: "Expand your menu to offer more variety to customers",
      icon: Package,
      type: "info"
    }
  ].filter(rec => rec.condition);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Performance Score</span>
          </CardTitle>
          <CardDescription>
            Overall business performance rating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 mx-auto">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={performanceScore >= 80 ? "#10B981" : performanceScore >= 60 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${performanceScore * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getScoreColor(performanceScore)}`}>
                    {performanceScore}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <Badge
                variant={performanceScore >= 80 ? "default" : performanceScore >= 60 ? "secondary" : "destructive"}
                className="text-sm"
              >
                {getScoreLabel(performanceScore)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Key Metrics</span>
          </CardTitle>
          <CardDescription>
            Important performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Conversion Rate</span>
              <span className="font-medium">{overview.conversionRate.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(overview.conversionRate, 100)} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Customer Rating</span>
              <span className="font-medium">{overview.avgRating.toFixed(1)}/5.0</span>
            </div>
            <Progress value={overview.avgRating * 20} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Order Success Rate</span>
              <span className="font-medium">
                {overview.totalOrders > 0 ? ((overview.completedOrders / overview.totalOrders) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <Progress 
              value={overview.totalOrders > 0 ? (overview.completedOrders / overview.totalOrders) * 100 : 0} 
              className="h-2" 
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Customer Retention</span>
              <span className="font-medium">
                {overview.totalCustomers > 0 ? ((overview.returningCustomers / overview.totalCustomers) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <Progress 
              value={overview.totalCustomers > 0 ? (overview.returningCustomers / overview.totalCustomers) * 100 : 0} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Recommendations</span>
          </CardTitle>
          <CardDescription>
            Suggestions to improve performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => {
                const Icon = rec.icon;
                return (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      rec.type === "error" ? "bg-red-100" :
                      rec.type === "warning" ? "bg-yellow-100" :
                      "bg-blue-100"
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        rec.type === "error" ? "text-red-600" :
                        rec.type === "warning" ? "text-yellow-600" :
                        "text-blue-600"
                      }`} />
                    </div>
                    <p className="text-sm text-gray-700 flex-1">
                      {rec.message}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Great job! Your performance is excellent across all metrics.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
