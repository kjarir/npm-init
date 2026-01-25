import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "deposit" | "withdraw";
  currentBalance?: number;
  onComplete?: (amount: number) => void;
}

export const FundsDialog = ({
  open,
  onOpenChange,
  type,
  currentBalance = 0,
  onComplete,
}: FundsDialogProps) => {
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (type === "withdraw" && numAmount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (type === "deposit" && numAmount > 50000) {
      toast.error("Maximum deposit amount is $50,000");
      return;
    }

    setProcessing(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(
        type === "deposit"
          ? `Successfully added $${numAmount.toLocaleString()} to your wallet`
          : `Withdrawal request of $${numAmount.toLocaleString()} submitted`
      );
      
      onComplete?.(numAmount);
      setAmount("");
      onOpenChange(false);
    } catch (error) {
      toast.error(`Failed to ${type === "deposit" ? "deposit" : "withdraw"} funds`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "deposit" ? "Add Funds" : "Withdraw Funds"}
          </DialogTitle>
          <DialogDescription>
            {type === "deposit"
              ? "Add money to your BobPay wallet"
              : `Withdraw to your bank account (Available: $${currentBalance.toLocaleString()})`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 border-3 border-foreground"
                disabled={processing}
                step="0.01"
                min="0"
                max={type === "withdraw" ? currentBalance : 50000}
              />
            </div>
          </div>

          {type === "deposit" && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 border-3 border-foreground bg-background"
                disabled={processing}
              >
                <option value="bank">Bank Transfer</option>
                <option value="card">Credit/Debit Card</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>
          )}

          {type === "withdraw" && (
            <div className="bg-warning/10 border-3 border-warning p-4">
              <p className="text-sm text-muted-foreground">
                Withdrawals typically take 2-3 business days to process. You'll receive an email confirmation once the transfer is initiated.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={!amount || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {type === "deposit" ? (
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                  )}
                  {type === "deposit" ? "Add Funds" : "Withdraw"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
