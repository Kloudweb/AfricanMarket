
import { 
  PaymentStatus, 
  PaymentProvider, 
  PaymentMethodType, 
  RefundStatus,
  PayoutStatus 
} from './types';

export interface PaymentCalculation {
  subtotal: number;
  tax: number;
  platformFee: number;
  processingFee: number;
  total: number;
}

export interface SplitCalculation {
  vendorAmount: number;
  driverAmount: number;
  platformAmount: number;
  vendorCommission: number;
  driverCommission: number;
  processingFee: number;
}

export class PaymentUtils {
  // ================================
  // PAYMENT CALCULATIONS
  // ================================

  static calculatePaymentBreakdown(
    subtotal: number,
    taxRate: number = 0.15,
    deliveryFee: number = 0,
    tips: number = 0
  ): PaymentCalculation {
    const tax = subtotal * taxRate;
    const platformFeePercentage = 0.025;
    const platformFeeFixed = 0.30;
    const platformFee = (subtotal * platformFeePercentage) + platformFeeFixed;
    const processingFee = 0.029 * subtotal + 0.30; // Stripe fees
    const total = subtotal + tax + deliveryFee + tips;

    return {
      subtotal,
      tax,
      platformFee,
      processingFee,
      total,
    };
  }

  static calculateSplitPayment(
    totalAmount: number,
    vendorCommissionRate: number = 0.20,
    driverCommissionRate: number = 0.25,
    deliveryFee: number = 5.00
  ): SplitCalculation {
    const processingFee = 0.029 * totalAmount + 0.30;
    const platformFeePercentage = 0.025;
    const platformFee = totalAmount * platformFeePercentage;
    
    const subtotal = totalAmount - deliveryFee;
    const vendorCommission = subtotal * vendorCommissionRate;
    const driverCommission = deliveryFee * driverCommissionRate;
    
    const vendorAmount = subtotal - vendorCommission - (processingFee * 0.7);
    const driverAmount = deliveryFee - driverCommission - (processingFee * 0.3);
    const platformAmount = vendorCommission + driverCommission + platformFee;

    return {
      vendorAmount,
      driverAmount,
      platformAmount,
      vendorCommission,
      driverCommission,
      processingFee,
    };
  }

  // ================================
  // PAYMENT VALIDATION
  // ================================

  static validatePaymentAmount(amount: number): boolean {
    return amount > 0 && amount <= 999999.99;
  }

  static validateRefundAmount(refundAmount: number, originalAmount: number): boolean {
    return refundAmount > 0 && refundAmount <= originalAmount;
  }

  static validatePaymentMethod(type: PaymentMethodType, provider: PaymentProvider): boolean {
    const validCombinations: Record<PaymentMethodType, PaymentProvider[]> = {
      CREDIT_CARD: [PaymentProvider.STRIPE, PaymentProvider.SQUARE],
      DEBIT_CARD: [PaymentProvider.STRIPE, PaymentProvider.SQUARE],
      BANK_ACCOUNT: [PaymentProvider.STRIPE],
      DIGITAL_WALLET: [PaymentProvider.STRIPE, PaymentProvider.SQUARE],
      PAYPAL: [PaymentProvider.PAYPAL],
      APPLE_PAY: [PaymentProvider.STRIPE, PaymentProvider.APPLE_PAY],
      GOOGLE_PAY: [PaymentProvider.STRIPE, PaymentProvider.GOOGLE_PAY],
      CRYPTOCURRENCY: [PaymentProvider.COINBASE],
      GIFT_CARD: [PaymentProvider.STRIPE],
      STORE_CREDIT: [PaymentProvider.STRIPE],
    };

    return validCombinations[type]?.includes(provider) || false;
  }

  // ================================
  // STATUS UTILITIES
  // ================================

  static getPaymentStatusColor(status: PaymentStatus): string {
    const colors = {
      [PaymentStatus.PENDING]: 'yellow',
      [PaymentStatus.PROCESSING]: 'blue',
      [PaymentStatus.COMPLETED]: 'green',
      [PaymentStatus.FAILED]: 'red',
      [PaymentStatus.REFUNDED]: 'gray',
      [PaymentStatus.CANCELLED]: 'gray',
      [PaymentStatus.DISPUTED]: 'orange',
      [PaymentStatus.CHARGEBACK]: 'red',
      [PaymentStatus.PARTIALLY_REFUNDED]: 'orange',
    };

    return colors[status] || 'gray';
  }

  static getRefundStatusColor(status: RefundStatus): string {
    const colors = {
      [RefundStatus.PENDING]: 'yellow',
      [RefundStatus.PROCESSING]: 'blue',
      [RefundStatus.COMPLETED]: 'green',
      [RefundStatus.FAILED]: 'red',
      [RefundStatus.CANCELLED]: 'gray',
      [RefundStatus.DISPUTED]: 'orange',
    };

    return colors[status] || 'gray';
  }

  static getPayoutStatusColor(status: PayoutStatus): string {
    const colors = {
      [PayoutStatus.PENDING]: 'yellow',
      [PayoutStatus.PROCESSING]: 'blue',
      [PayoutStatus.COMPLETED]: 'green',
      [PayoutStatus.FAILED]: 'red',
      [PayoutStatus.CANCELLED]: 'gray',
      [PayoutStatus.REVERSED]: 'orange',
    };

    return colors[status] || 'gray';
  }

  // ================================
  // FORMATTING UTILITIES
  // ================================

  static formatCurrency(amount: number, currency: string = 'CAD'): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  static formatPaymentMethodDisplay(
    type: PaymentMethodType,
    last4?: string,
    brand?: string
  ): string {
    if (type === PaymentMethodType.CREDIT_CARD || type === PaymentMethodType.DEBIT_CARD) {
      return `${brand?.toUpperCase() || 'Card'} ****${last4 || '0000'}`;
    }
    
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  static maskCardNumber(cardNumber: string): string {
    return cardNumber.replace(/\d(?=\d{4})/g, '*');
  }

  static formatTransactionNumber(prefix: string, id: string): string {
    return `${prefix}-${id.substring(0, 8).toUpperCase()}`;
  }

  // ================================
  // DATE UTILITIES
  // ================================

  static getPayoutScheduleDate(
    frequency: string,
    dayOfWeek?: number,
    dayOfMonth?: number,
    hour: number = 9
  ): Date {
    const now = new Date();
    const nextPayout = new Date();

    switch (frequency) {
      case 'DAILY':
        nextPayout.setDate(now.getDate() + 1);
        break;
      case 'WEEKLY':
        const targetDay = dayOfWeek || 1; // Default to Monday
        const daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
        nextPayout.setDate(now.getDate() + (daysUntilTarget || 7));
        break;
      case 'MONTHLY':
        const targetDate = dayOfMonth || 1;
        nextPayout.setDate(targetDate);
        if (nextPayout <= now) {
          nextPayout.setMonth(nextPayout.getMonth() + 1);
        }
        break;
      default:
        nextPayout.setHours(hour, 0, 0, 0);
        return nextPayout;
    }

    nextPayout.setHours(hour, 0, 0, 0);
    return nextPayout;
  }

  // ================================
  // VALIDATION UTILITIES
  // ================================

  static validateCardNumber(cardNumber: string): boolean {
    // Luhn algorithm
    const digits = cardNumber.replace(/\s/g, '').split('').reverse();
    let sum = 0;
    
    for (let i = 0; i < digits.length; i++) {
      let digit = parseInt(digits[i]);
      
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
    }
    
    return sum % 10 === 0;
  }

  static validateExpiryDate(month: number, year: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) return false;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  static validateCVV(cvv: string, cardType?: string): boolean {
    const cvvPattern = cardType === 'amex' ? /^\d{4}$/ : /^\d{3}$/;
    return cvvPattern.test(cvv);
  }

  // ================================
  // SECURITY UTILITIES
  // ================================

  static generatePaymentToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token;
  }

  static hashSensitiveData(data: string): string {
    // In production, use a proper hashing library like bcrypt
    return Buffer.from(data).toString('base64');
  }

  static encryptSensitiveData(data: string): string {
    // In production, use proper encryption
    return Buffer.from(data).toString('base64');
  }

  static decryptSensitiveData(encryptedData: string): string {
    // In production, use proper decryption
    return Buffer.from(encryptedData, 'base64').toString();
  }

  // ================================
  // ANALYTICS UTILITIES
  // ================================

  static calculateConversionRate(successful: number, total: number): number {
    if (total === 0) return 0;
    return (successful / total) * 100;
  }

  static calculateAverageTransactionAmount(transactions: number[]): number {
    if (transactions.length === 0) return 0;
    return transactions.reduce((sum, amount) => sum + amount, 0) / transactions.length;
  }

  static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // ================================
  // CURRENCY UTILITIES
  // ================================

  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rate: number): number {
    if (fromCurrency === toCurrency) return amount;
    return amount * rate;
  }

  static getSupportedCurrencies(): string[] {
    return ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];
  }

  static getCurrencySymbol(currency: string): string {
    const symbols = {
      'CAD': '$',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AUD': 'A$',
      'JPY': '¥',
    };
    
    return symbols[currency as keyof typeof symbols] || '$';
  }
}
