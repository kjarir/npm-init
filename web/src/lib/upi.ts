/**
 * UPI Payment Integration
 * Generates UPI payment links and QR codes for manual processing
 */

/**
 * Generate UPI payment link
 */
export function generateUPILink(
  amount: number,
  merchantName: string = 'BobPay',
  transactionId: string,
  note?: string
): string {
  // Format: upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>&tr=<TRANSACTION_ID>
  
  // You'll need to set your actual UPI ID in environment variables
  const upiId = import.meta.env.VITE_UPI_ID || 'your-upi-id@paytm';
  
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note || `Payment for ${transactionId}`,
    tr: transactionId,
  });

  return `upi://pay?${params.toString()}`;
}

/**
 * Generate UPI QR code data
 */
export function generateUPIQRData(
  amount: number,
  merchantName: string = 'BobPay',
  transactionId: string,
  note?: string
): string {
  const upiId = import.meta.env.VITE_UPI_ID || 'your-upi-id@paytm';
  
  // UPI QR code format
  return `${upiId}?pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || `Payment for ${transactionId}`)}&tr=${transactionId}`;
}

/**
 * Generate bank account details for manual transfer
 */
export function getBankDetails() {
  return {
    accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || 'BobPay',
    accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || 'XXXXXXXXXXXX',
    ifscCode: import.meta.env.VITE_BANK_IFSC || 'XXXX0000000',
    bankName: import.meta.env.VITE_BANK_NAME || 'Your Bank',
    upiId: import.meta.env.VITE_UPI_ID || 'your-upi-id@paytm',
  };
}
