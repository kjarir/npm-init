import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { processMilestonePayment, MilestonePaymentData } from '@/services/milestonePayment';
import { toast } from 'sonner';

interface MilestonePaymentButtonProps {
  milestone: {
    id: string;
    title: string;
    amount: number;
    milestone_number: number;
  };
  project: {
    id: string;
    title: string;
    client_id: string;
    freelancer_id: string;
  };
  freelancerWallet: string;
  clientWallet: string;
  verificationScore?: number;
  deliverablesHash?: string;
  onPaymentComplete?: () => void;
}

export const MilestonePaymentButton = ({
  milestone,
  project,
  freelancerWallet,
  clientWallet,
  verificationScore,
  deliverablesHash,
  onPaymentComplete,
}: MilestonePaymentButtonProps) => {
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (!confirm(`Release payment of $${milestone.amount.toLocaleString()} for milestone "${milestone.title}"?`)) {
      return;
    }

    setProcessing(true);

    try {
      const paymentData: MilestonePaymentData = {
        projectId: project.id,
        milestoneId: milestone.id,
        amount: milestone.amount,
        freelancerId: project.freelancer_id,
        freelancerWallet,
        clientId: project.client_id,
        clientWallet,
        projectTitle: project.title,
        milestoneTitle: milestone.title,
        milestoneNumber: milestone.milestone_number,
        verificationScore,
        deliverablesHash,
      };

      const result = await processMilestonePayment(paymentData);

      toast.success('Milestone payment processed successfully!', {
        description: `Certificate: ${result.certificateURL}`,
        duration: 5000,
      });

      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (error: any) {
      toast.error(`Payment failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Button
      variant="success"
      onClick={handlePayment}
      disabled={processing}
      className="gap-2"
    >
      {processing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4" />
          Release Payment
        </>
      )}
    </Button>
  );
};
