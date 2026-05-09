import { useState } from 'react';
import { paymentAPI } from '../services/api';

// Luhn Algorithm — للتحقق من صحة رقم البطاقة محلياً
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number);
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) {
      let doubled = d * 2;
      if (doubled > 9) doubled -= 9;
      return acc + doubled;
    }
    return acc + d;
  }, 0);
  return sum % 10 === 0;
}

function detectBrand(num: string): string {
  if (/^4/.test(num))         return 'Visa';
  if (/^5[1-5]/.test(num))    return 'Mastercard';
  if (/^3[47]/.test(num))     return 'Amex';
  if (/^9[0-9]/.test(num))    return 'Mada'; // بطاقات مدى السعودية
  return 'Unknown';
}

export const usePayment = () => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [mockPaymentId, setMockPaymentId] = useState<string | null>(null);

  const processPayment = async ({
    itemType,
    itemId,
    quantity,
    bookingId,
    amount,
    cardNumber,
    expiryMonth,
    expiryYear,
    cvv,
    cardHolder,
  }: {
    itemType: 'event' | 'tour' | 'rental';
    itemId: string;
    quantity?: number;
    bookingId?: string;
    amount: number;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardHolder: string;
  }) => {
    setError(null);
    setLoading(true);

    // ── Client-side validation ─────────────────────────────
    const rawNum = cardNumber.replace(/\s/g, '');
    if (rawNum.length < 15 || !luhnCheck(rawNum)) {
      setError('رقم البطاقة غير صحيح');
      setLoading(false);
      return false;
    }
    if (!expiryMonth || !expiryYear) {
      setError('تاريخ الانتهاء مطلوب');
      setLoading(false);
      return false;
    }
    if (cvv.length < 3) {
      setError('رمز CVV غير صحيح');
      setLoading(false);
      return false;
    }
    if (!cardHolder.trim()) {
      setError('اسم حامل البطاقة مطلوب');
      setLoading(false);
      return false;
    }

    try {
      const result = await paymentAPI.createInvoice(
        itemType,
        itemId,
        quantity,
        bookingId,
        {
          name: cardHolder,
          number: rawNum,
          month: expiryMonth,
          year: expiryYear,
          cvc: cvv,
        }
      );

      if (result.success && result.url) {
        // Redirect the user to Moyasar's 3D Secure page
        window.location.href = result.url;
        return true;
      } else {
        setError('فشل الدفع، تأكد من صحة البيانات');
        return false;
      }

    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'فشل الدفع، تأكد من رصيد البطاقة';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading, error, success, mockPaymentId };
};
