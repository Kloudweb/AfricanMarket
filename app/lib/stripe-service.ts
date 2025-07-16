
import Stripe from 'stripe';
import { prisma } from './db';
import { PaymentProvider, PaymentStatus } from './types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-06-20' as any,
});

export interface StripeAccountData {
  userId: string;
  type: 'individual' | 'company';
  country: string;
  email: string;
  businessType?: string;
  individual?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dob: {
      day: number;
      month: number;
      year: number;
    };
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  company?: {
    name: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

export class StripeService {
  // ================================
  // CONNECTED ACCOUNTS
  // ================================

  async createConnectedAccount(data: StripeAccountData) {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: data.country,
        email: data.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: data.type,
        individual: data.individual,
        company: data.company,
        metadata: {
          userId: data.userId,
        },
      });

      // Save to database
      await prisma.paymentAccount.create({
        data: {
          userId: data.userId,
          accountType: 'connected_account',
          provider: PaymentProvider.STRIPE,
          connectedAccountId: account.id,
          isVerified: false,
          country: data.country,
          capabilities: ['transfers', 'card_payments'],
        },
      });

      return account;
    } catch (error) {
      console.error('Error creating connected account:', error);
      throw error;
    }
  }

  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw error;
    }
  }

  async getAccountStatus(accountId: string) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      
      return {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        capabilities: account.capabilities,
      };
    } catch (error) {
      console.error('Error getting account status:', error);
      throw error;
    }
  }

  // ================================
  // PAYMENT PROCESSING
  // ================================

  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    applicationFeeAmount?: number,
    connectedAccountId?: string
  ) {
    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId,
        confirmation_method: 'manual',
        confirm: false,
      };

      if (connectedAccountId) {
        paymentIntentData.transfer_data = {
          destination: connectedAccountId,
        };
      }

      if (applicationFeeAmount) {
        paymentIntentData.application_fee_amount = Math.round(applicationFeeAmount * 100);
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  // ================================
  // PAYOUTS
  // ================================

  async createPayout(amount: number, currency: string, connectedAccountId: string) {
    try {
      const payout = await stripe.payouts.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
      }, {
        stripeAccount: connectedAccountId,
      });

      return payout;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  async getPayouts(connectedAccountId: string, limit = 10) {
    try {
      const payouts = await stripe.payouts.list({
        limit,
      }, {
        stripeAccount: connectedAccountId,
      });

      return payouts;
    } catch (error) {
      console.error('Error fetching payouts:', error);
      throw error;
    }
  }

  // ================================
  // REFUNDS
  // ================================

  async createRefund(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      if (reason) {
        refundData.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      const refund = await stripe.refunds.create(refundData);

      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  // ================================
  // WEBHOOKS
  // ================================

  async handleWebhook(body: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      // Log webhook event
      await prisma.paymentWebhook.create({
        data: {
          provider: PaymentProvider.STRIPE,
          eventType: event.type,
          eventId: event.id,
          requestBody: event as any,
          processed: false,
        },
      });

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payout.paid':
          await this.handlePayoutPaid(event.data.object as Stripe.Payout);
          break;
        case 'payout.failed':
          await this.handlePayoutFailed(event.data.object as Stripe.Payout);
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentId: paymentIntent.id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            capturedAt: new Date(),
          },
        });

        // Create transaction record
        await prisma.transaction.create({
          data: {
            transactionNumber: `TXN-${Date.now()}`,
            userId: payment.userId,
            type: 'PAYMENT',
            amount: payment.amount,
            currency: payment.currency,
            paymentId: payment.id,
            description: 'Payment completed',
          },
        });
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentId: paymentIntent.id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            failureReason: paymentIntent.last_payment_error?.message,
          },
        });
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  private async handlePayoutPaid(payout: Stripe.Payout) {
    try {
      const payoutRecord = await prisma.payout.findFirst({
        where: { stripePayoutId: payout.id },
      });

      if (payoutRecord) {
        await prisma.payout.update({
          where: { id: payoutRecord.id },
          data: {
            status: 'COMPLETED',
            arrivedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error handling payout paid:', error);
    }
  }

  private async handlePayoutFailed(payout: Stripe.Payout) {
    try {
      const payoutRecord = await prisma.payout.findFirst({
        where: { stripePayoutId: payout.id },
      });

      if (payoutRecord) {
        await prisma.payout.update({
          where: { id: payoutRecord.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: payout.failure_message,
          },
        });
      }
    } catch (error) {
      console.error('Error handling payout failed:', error);
    }
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripeChargeId: dispute.charge as string },
      });

      if (payment) {
        await prisma.paymentDispute.create({
          data: {
            paymentId: payment.id,
            disputeNumber: `DIS-${Date.now()}`,
            status: 'CREATED',
            reason: dispute.reason,
            amount: dispute.amount / 100,
            currency: dispute.currency.toUpperCase(),
            stripeDisputeId: dispute.id,
            evidenceBy: dispute.evidence_details.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null,
          },
        });
      }
    } catch (error) {
      console.error('Error handling dispute created:', error);
    }
  }

  // ================================
  // ANALYTICS
  // ================================

  async getBalanceTransactions(connectedAccountId: string, limit = 10) {
    try {
      const transactions = await stripe.balanceTransactions.list({
        limit,
      }, {
        stripeAccount: connectedAccountId,
      });

      return transactions;
    } catch (error) {
      console.error('Error fetching balance transactions:', error);
      throw error;
    }
  }

  async getBalance(connectedAccountId: string) {
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: connectedAccountId,
      });

      return balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
