import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import financeService from '@/services/finance.service';

interface PaymentButtonProps {
  invoiceId: string;
  amount: number;
  provider?: 'jazzcash' | 'easypaisa';
  customerName?: string;
  customerPhone?: string;
}

export default function PaymentButton({
  invoiceId,
  amount,
  provider = 'jazzcash',
  customerName,
  customerPhone,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const response = await financeService.createOnlinePaymentSession(invoiceId, {
        provider,
        customer_name: customerName,
        customer_phone: customerPhone,
      });

      const checkoutUrl = response.data.checkout_url;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
        toast.success('Redirecting to payment gateway...');
      } else {
        toast.error('Unable to build payment checkout link.');
      }
    } catch (error) {
      toast.error('Failed to create online payment session.');
      console.error('Payment session error', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      {loading ? 'Preparing payment...' : `Pay ${provider === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} ₨${amount.toFixed(2)}`}
    </Button>
  );
}
