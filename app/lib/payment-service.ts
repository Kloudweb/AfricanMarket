
import { prisma } from './db';
import Stripe from 'stripe';
// Square client - commented out for now due to import issues
// import { Client as SquareClient } from 'square';
import { 
  PaymentStatus, 
  PaymentProvider, 
  PaymentMethodType, 
  TransactionType,
  RefundStatus,
  PayoutStatus,
  PayoutFrequency
} from './types';
import { v4 as uuidv4 } from 'uuid';

// Initialize payment providers
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-06-20' as any,
});

// Square client - commented out for now due to import issues
// const squareClient = new SquareClient({
//   accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
//   environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
// });

export interface PaymentIntentData {
  amount: number;
  currency: string;
  orderId?: string;
  rideId?: string;
  customerId: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: any;
}

export interface PaymentMethodData {
  userId: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  stripePaymentMethodId?: string;
  squareCardId?: string;
  isDefault?: boolean;
  nickname?: string;
  billingAddress?: any;
}

export interface PayoutData {
  userId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: any;
}

export class PaymentService {
  // ================================
  // PAYMENT PROCESSING
  // ================================

  async createPaymentIntent(data: PaymentIntentData) {
    try {
      const paymentNumber = `PAY-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          paymentNumber,
          userId: data.customerId,
          orderId: data.orderId || null,
          rideId: data.rideId || null,
          amount: data.amount,
          currency: data.currency,
          status: PaymentStatus.PENDING,
          paymentProvider: PaymentProvider.STRIPE,
          subtotal: data.amount,
          description: data.description,
          paymentMethod: 'card',
          metadata: data.metadata,
        },
      });

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        customer: await this.getOrCreateStripeCustomer(data.customerId),
        payment_method: data.paymentMethodId,
        confirmation_method: 'manual',
        confirm: false,
        metadata: {
          paymentId: payment.id,
          orderId: data.orderId || '',
          rideId: data.rideId || '',
        },
      });

      // Update payment with Stripe details
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          requiresAction: paymentIntent.status === 'requires_action',
        },
      });

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async confirmPayment(paymentId: string, paymentMethodId?: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Confirm with Stripe
      const paymentIntent = await stripe.paymentIntents.confirm(
        payment.stripePaymentId!,
        {
          payment_method: paymentMethodId,
        }
      );

      // Update payment status
      let status: PaymentStatus = PaymentStatus.PROCESSING;
      if (paymentIntent.status === 'succeeded') {
        status = 'COMPLETED' as PaymentStatus;
      } else if (paymentIntent.status === 'requires_action') {
        status = 'PENDING' as PaymentStatus;
      } else if (paymentIntent.status === 'canceled') {
        status = 'CANCELLED' as PaymentStatus;
      }

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status,
          capturedAt: paymentIntent.status === 'succeeded' ? new Date() : null,
          last4: (paymentIntent as any).charges?.data?.[0]?.payment_method_details?.card?.last4,
          brand: (paymentIntent as any).charges?.data?.[0]?.payment_method_details?.card?.brand,
        },
      });

      // Process payment splitting if successful
      if (paymentIntent.status === 'succeeded') {
        await this.processSplitPayment(paymentId);
      }

      return {
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  async processSplitPayment(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            include: {
              vendor: true,
              driver: true,
            },
          },
          ride: {
            include: {
              driver: true,
            },
          },
        },
      });

      if (!payment) return;

      const splits = [];
      
      // Calculate platform fee (2.5% + $0.30)
      const platformFeePercentage = 0.025;
      const platformFeeFixed = 0.30;
      const platformFee = (payment.amount * platformFeePercentage) + platformFeeFixed;

      if (payment.order) {
        // Order payment splitting
        const vendorCommission = payment.order.vendor.commissionRate || 0.20;
        const vendorAmount = payment.amount * (1 - vendorCommission) - platformFee;
        
        splits.push({
          paymentId: payment.id,
          recipientId: payment.order.vendorId,
          recipientType: 'vendor',
          amount: payment.amount,
          percentage: (1 - vendorCommission) * 100,
          commission: payment.amount * vendorCommission,
          processingFee: platformFee,
          netAmount: vendorAmount,
          description: `Vendor payment for order ${payment.order.orderNumber}`,
        });

        if (payment.order.driver) {
          const driverCommission = payment.order.driver.commissionRate || 0.25;
          const deliveryFee = payment.order.deliveryFee || 5.00; // Default delivery fee
          const driverAmount = deliveryFee * (1 - driverCommission);
          
          splits.push({
            paymentId: payment.id,
            recipientId: payment.order.driverId!,
            recipientType: 'driver',
            amount: deliveryFee,
            percentage: (1 - driverCommission) * 100,
            commission: deliveryFee * driverCommission,
            processingFee: 0,
            netAmount: driverAmount,
            description: `Driver payment for order ${payment.order.orderNumber}`,
          });
        }
      } else if (payment.ride) {
        // Ride payment splitting
        const driverCommission = payment.ride.driver?.commissionRate || 0.25;
        const driverAmount = payment.amount * (1 - driverCommission) - platformFee;
        
        splits.push({
          paymentId: payment.id,
          recipientId: payment.ride.driverId!,
          recipientType: 'driver',
          amount: payment.amount,
          percentage: (1 - driverCommission) * 100,
          commission: payment.amount * driverCommission,
          processingFee: platformFee,
          netAmount: driverAmount,
          description: `Driver payment for ride ${payment.ride.rideNumber}`,
        });
      }

      // Create split records
      for (const split of splits) {
        await prisma.paymentSplit.create({
          data: split,
        });
      }

      // Update payment with split amounts
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          platformFee,
          vendorAmount: splits.find(s => s.recipientType === 'vendor')?.netAmount || 0,
          driverAmount: splits.find(s => s.recipientType === 'driver')?.netAmount || 0,
        },
      });

      return splits;
    } catch (error) {
      console.error('Error processing split payment:', error);
      throw error;
    }
  }

  // ================================
  // PAYMENT METHODS
  // ================================

  async addPaymentMethod(data: PaymentMethodData) {
    try {
      let stripePaymentMethodId = data.stripePaymentMethodId;
      
      if (!stripePaymentMethodId && data.type === PaymentMethodType.CREDIT_CARD) {
        // Create Stripe payment method if not provided
        const customer = await this.getOrCreateStripeCustomer(data.userId);
        // This would typically be done on the client side
        // stripePaymentMethodId = await this.createStripePaymentMethod(customer);
      }

      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          stripePaymentMethodId,
          squareCardId: data.squareCardId,
          isDefault: data.isDefault || false,
          nickname: data.nickname,
          billingAddress: data.billingAddress,
        },
      });

      return paymentMethod;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  async getPaymentMethods(userId: string) {
    try {
      return await prisma.paymentMethod.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    try {
      await prisma.$transaction(async (tx) => {
        // Remove default from all payment methods
        await tx.paymentMethod.updateMany({
          where: { userId },
          data: { isDefault: false },
        });

        // Set new default
        await tx.paymentMethod.update({
          where: { id: paymentMethodId },
          data: { isDefault: true },
        });
      });

      return true;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  // ================================
  // REFUNDS
  // ================================

  async createRefund(paymentId: string, amount: number, reason: string, requestedBy: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const refundNumber = `REF-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Create refund record
      const refund = await prisma.refund.create({
        data: {
          refundNumber,
          paymentId,
          amount,
          currency: payment.currency,
          status: RefundStatus.PENDING,
          reason,
          requestedBy,
          refundAmount: amount,
          refundFee: 0, // Stripe doesn't charge fees for refunds
          netRefund: amount,
        },
      });

      // Process refund with Stripe
      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentId!,
        amount: Math.round(amount * 100),
        metadata: {
          refundId: refund.id,
          paymentId,
        },
      });

      // Update refund with Stripe details
      await prisma.refund.update({
        where: { id: refund.id },
        data: {
          stripeRefundId: stripeRefund.id,
          status: RefundStatus.PROCESSING,
          processedAt: new Date(),
        },
      });

      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  // ================================
  // PAYOUTS
  // ================================

  async createPayout(data: PayoutData) {
    try {
      const payoutNumber = `PO-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Get user's payment account
      const paymentAccount = await prisma.paymentAccount.findFirst({
        where: {
          userId: data.userId,
          isActive: true,
          isDefault: true,
        },
      });

      if (!paymentAccount) {
        throw new Error('No active payment account found');
      }

      // Calculate fees (2% payout fee)
      const feePercentage = 0.02;
      const fees = data.amount * feePercentage;
      const netAmount = data.amount - fees;

      // Create payout record
      const payout = await prisma.payout.create({
        data: {
          payoutNumber,
          userId: data.userId,
          paymentAccountId: paymentAccount.id,
          amount: data.amount,
          currency: data.currency,
          status: PayoutStatus.PENDING,
          grossAmount: data.amount,
          fees,
          netAmount,
          description: data.description,
          metadata: data.metadata,
          periodStart: new Date(),
          periodEnd: new Date(),
        },
      });

      // Process payout with Stripe
      if (paymentAccount.provider === PaymentProvider.STRIPE) {
        await this.processStripePayout(payout.id);
      }

      return payout;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  async processStripePayout(payoutId: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
        include: { paymentAccount: true },
      });

      if (!payout) return;

      const stripePayout = await stripe.payouts.create({
        amount: Math.round(payout.netAmount * 100),
        currency: payout.currency.toLowerCase(),
        metadata: {
          payoutId: payout.id,
        },
      }, {
        stripeAccount: payout.paymentAccount.connectedAccountId!,
      });

      // Update payout with Stripe details
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          stripePayoutId: stripePayout.id,
          status: PayoutStatus.PROCESSING,
          processedAt: new Date(),
        },
      });

      return stripePayout;
    } catch (error) {
      console.error('Error processing Stripe payout:', error);
      throw error;
    }
  }

  // ================================
  // UTILITIES
  // ================================

  async getOrCreateStripeCustomer(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if customer already exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0].id;
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId: string, page = 1, limit = 10) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          payment: {
            select: {
              paymentNumber: true,
              amount: true,
              currency: true,
            },
          },
          payout: {
            select: {
              payoutNumber: true,
              amount: true,
              currency: true,
            },
          },
          refund: {
            select: {
              refundNumber: true,
              amount: true,
              currency: true,
            },
          },
        },
      });

      const total = await prisma.transaction.count({
        where: { userId },
      });

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  async getPaymentAnalytics(startDate: Date, endDate: Date) {
    try {
      const analytics = await prisma.payment.groupBy({
        by: ['status', 'paymentProvider'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
          platformFee: true,
        },
      });

      return analytics;
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
