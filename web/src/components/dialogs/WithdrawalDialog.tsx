import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, ArrowUpRight, Loader2, Shield, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCreateWithdrawalRequest } from "@/hooks/useWithdrawal";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
}

export const WithdrawalDialog = ({
  open,
  onOpenChange,
  currentBalance,
}: WithdrawalDialogProps) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "bank">("upi");
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  
  const createWithdrawal = useCreateWithdrawalRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (numAmount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (numAmount < 10) {
      toast.error("Minimum withdrawal amount is $10");
      return;
    }

    // Validate payment details
    if (paymentMethod === "upi") {
      if (!upiId || !upiId.includes("@")) {
        toast.error("Please enter a valid UPI ID");
        return;
      }
    } else {
      if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
        toast.error("Please fill all bank details");
        return;
      }
    }

    try {
      await createWithdrawal.mutateAsync({
        amount: numAmount,
        upiId: paymentMethod === "upi" ? upiId : undefined,
        bankAccountNumber: paymentMethod === "bank" ? accountNumber : undefined,
        bankIFSC: paymentMethod === "bank" ? ifscCode : undefined,
        bankName: paymentMethod === "bank" ? bankName : undefined,
        accountHolderName: paymentMethod === "bank" ? accountHolderName : undefined,
      });

      // Reset form
      setAmount("");
      setUpiId("");
      setAccountHolderName("");
      setAccountNumber("");
      setIfscCode("");
      setBankName("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create withdrawal request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redeem BobCoins</DialogTitle>
          <DialogDescription>
            Convert BobCoin back to real money. Available: {currentBalance.toLocaleString()} BC
            <br />
            <span className="text-xs text-muted-foreground">(Automated - Secure & Decentralized)</span>
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
                disabled={createWithdrawal.isPending}
                step="0.01"
                min="10"
                max={currentBalance}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You will receive ₹{(parseFloat(amount) * 83).toFixed(2)} (approx)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "upi" | "bank")}
              className="w-full h-10 px-3 border-3 border-foreground bg-background"
              disabled={createWithdrawal.isPending}
            >
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          {paymentMethod === "upi" ? (
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                type="text"
                placeholder="yourname@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="border-3 border-foreground"
                disabled={createWithdrawal.isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your UPI ID (e.g., name@paytm, name@ybl, name@okaxis)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  type="text"
                  placeholder="John Doe"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="border-3 border-foreground"
                  disabled={createWithdrawal.isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  placeholder="1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className="border-3 border-foreground font-mono"
                  disabled={createWithdrawal.isPending}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    type="text"
                    placeholder="ABCD0123456"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="border-3 border-foreground font-mono"
                    disabled={createWithdrawal.isPending}
                    required
                    maxLength={11}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    type="text"
                    placeholder="State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="border-3 border-foreground"
                    disabled={createWithdrawal.isPending}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-warning/10 border-3 border-warning p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-warning mt-0.5" size={16} />
              <div className="text-sm">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Funds will be locked until withdrawal is processed</li>
                  <li>• Processing is automated (usually within minutes)</li>
                  <li>• BobCoin will be burned on blockchain automatically</li>
                  <li>• Money transferred directly to your bank account</li>
                  <li>• Fully automated - secure & decentralized!</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-success/10 border-3 border-success p-4">
            <div className="flex items-start gap-2">
              <Shield className="text-success mt-0.5" size={16} />
              <div className="text-sm">
                <p className="font-semibold mb-1">Security:</p>
                <p className="text-xs text-muted-foreground">
                  Your payment details are encrypted and secure. We never store your full bank account details.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createWithdrawal.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={!amount || createWithdrawal.isPending}
            >
              {createWithdrawal.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Request Withdrawal
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
