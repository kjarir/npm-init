import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, ArrowDownLeft, Loader2, QrCode, Copy, Check, ExternalLink, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCreateDepositRequest } from "@/hooks/useDeposit";
import { generateUPILink, generateUPIQRData, getBankDetails } from "@/lib/upi";
import QRCodeLib from "qrcode";
import { useQueryClient } from "@tanstack/react-query";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance?: number;
}

export const DepositDialog = ({
  open,
  onOpenChange,
  currentBalance = 0,
}: DepositDialogProps) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "bank_transfer">("upi");
  const [step, setStep] = useState<"amount" | "payment">("amount");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  
  const createDeposit = useCreateDepositRequest();
  const queryClient = useQueryClient();
  const bankDetails = getBankDetails();

  // Generate QR code data (must be declared before useEffect)
  const qrData = requestId && amount ? generateUPIQRData(parseFloat(amount), "BobPay", requestId) : "";

  // Generate QR code when qrData is available
  useEffect(() => {
    if (qrData) {
      QRCodeLib.toDataURL(qrData, { width: 200, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    } else {
      setQrCodeUrl(""); // Clear QR code if no data
    }
  }, [qrData]);

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (numAmount > 50000) {
      toast.error("Maximum deposit amount is $50,000");
      return;
    }

    try {
      const request = await createDeposit.mutateAsync({
        amount: numAmount,
        paymentMethod,
      });
      
      setRequestId(request.id);
      
      // Check if it's dummy mode (auto-processes - but REAL blockchain minting!)
      const gateway = import.meta.env.VITE_PAYMENT_GATEWAY || 'dummy';
      if (gateway === 'dummy') {
        // Dummy mode: Show success message, REAL BobCoin will be minted on blockchain!
        toast.success('Payment processing... Real BobCoin will be minted on blockchain in a few seconds!', {
          description: 'This is REAL blockchain minting, not dummy numbers!',
          duration: 5000,
        });
        setTimeout(() => {
          handleClose();
          // Refresh balance after a few seconds to show real coins
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['bobcoin-balance'] });
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            toast.success('Check your wallet - Real BobCoin should be there!', {
              description: 'Balance is fetched from blockchain',
            });
          }, 4000); // Give blockchain time to process
        }, 2500);
        return;
      }

      // Real gateway: Show payment details
      if ((request as any).paymentLink && paymentMethod === 'upi') {
        window.open((request as any).paymentLink, '_blank');
      }
      setStep("payment");
    } catch (error: any) {
      toast.error(error.message || "Failed to create deposit request");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUPIPay = () => {
    if (!requestId || !amount) return;
    const upiLink = generateUPILink(parseFloat(amount), "BobPay", requestId);
    window.open(upiLink, "_blank");
  };

  const handleClose = () => {
    setStep("amount");
    setAmount("");
    setRequestId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "amount" ? (
          <>
            <DialogHeader>
              <DialogTitle>Buy BobCoins</DialogTitle>
              <DialogDescription>
                Add real money to your wallet. BobCoins will be minted automatically after payment.
                <br />
                <span className="text-xs text-muted-foreground">(Automated - No admin needed)</span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAmountSubmit} className="space-y-4">
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
                    disabled={createDeposit.isPending}
                    step="0.01"
                    min="0.01"
                    max="50000"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You will receive {amount ? parseFloat(amount).toFixed(2) : "0.00"} BobCoin
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "upi" | "bank_transfer")}
                  className="w-full h-10 px-3 border-3 border-foreground bg-background"
                  disabled={createDeposit.isPending}
                >
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="bg-secondary border-3 border-foreground p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="text-success" size={16} />
                  <span className="font-semibold">Secure Payment</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>• Payment is processed manually for security</li>
                  <li>• BobCoin will be minted after verification</li>
                  <li>• Usually takes 1-2 hours during business hours</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createDeposit.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  disabled={!amount || createDeposit.isPending}
                >
                  {createDeposit.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="mr-2 h-4 w-4" />
                      Continue
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Request ID: <span className="font-mono text-xs">{requestId}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {paymentMethod === "upi" ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Scan QR code or click the payment link
                    </p>
                    {qrData && (
                      <div className="text-center">
                        {qrCodeUrl ? (
                          <div className="bg-white p-4 rounded-lg border-3 border-foreground inline-block">
                            <img src={qrCodeUrl} alt="UPI QR Code" className="w-[200px] h-[200px]" />
                          </div>
                        ) : (
                          <div className="w-[200px] h-[200px] bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 mx-auto">
                            <p className="text-xs text-gray-500">Generating QR code...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>UPI ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={bankDetails.upiId}
                        readOnly
                        className="font-mono border-3 border-foreground"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(bankDetails.upiId)}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`₹${parseFloat(amount).toFixed(2)}`}
                        readOnly
                        className="font-mono border-3 border-foreground"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(amount)}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="accent"
                    className="w-full"
                    onClick={handleUPIPay}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open UPI App
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-secondary border-3 border-foreground p-4 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Account Name</Label>
                      <p className="font-mono font-semibold">{bankDetails.accountName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Account Number</Label>
                      <div className="flex gap-2">
                        <p className="font-mono font-semibold">{bankDetails.accountNumber}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(bankDetails.accountNumber)}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">IFSC Code</Label>
                      <div className="flex gap-2">
                        <p className="font-mono font-semibold">{bankDetails.ifscCode}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(bankDetails.ifscCode)}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Bank Name</Label>
                      <p className="font-semibold">{bankDetails.bankName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <p className="font-mono font-semibold text-lg">₹{parseFloat(amount).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-warning/10 border-3 border-warning p-4">
                    <div className="flex items-start gap-2">
                      <Clock className="text-warning mt-0.5" size={16} />
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Important:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Include Request ID in transaction remarks: <span className="font-mono">{requestId}</span></li>
                          <li>• Payment will be verified manually</li>
                          <li>• BobCoin will be minted after verification</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-success/10 border-3 border-success p-4">
                <div className="flex items-start gap-2">
                  <Check className="text-success mt-0.5" size={16} />
                  <div className="text-sm">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>1. Complete the payment using the details above</li>
                  <li>2. Payment is verified automatically</li>
                  <li>3. BobCoin is minted on blockchain</li>
                  <li>4. Your wallet balance updates automatically</li>
                  <li>5. Fully automated - secure & decentralized!</li>
                </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                >
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
