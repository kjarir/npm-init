import jsPDF from 'jspdf';
import { getIPFSURL } from './ipfs';
import { uploadToIPFS } from './ipfs';

/**
 * Certificate data structure
 */
export interface CertificateData {
  certificateId: string;
  projectId: string;
  projectTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  milestoneNumber: number;
  amount: number;
  freelancerName: string;
  freelancerWallet: string;
  clientName: string;
  clientWallet: string;
  verificationScore?: number;
  transactionHash: string;
  blockNumber?: string;
  timestamp: string;
  ipfsHash?: string;
  deliverablesHash?: string;
}

/**
 * Generate PDF certificate matching website style
 */
export const generateCertificatePDF = async (data: CertificateData): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // Colors matching website (from index.css)
  // Accent: 12 85% 60% (Coral)
  // Primary: 220 65% 18% (Deep Navy)
  // Background: 45 30% 97% (Warm Cream)
  // Foreground: 220 30% 12% (Dark)
  
  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): number[] => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  };

  const accentColor = hslToRgb(12, 85, 60); // Coral accent
  const primaryColor = hslToRgb(220, 65, 18); // Deep Navy
  const backgroundColor = hslToRgb(45, 30, 97); // Warm Cream
  const foregroundColor = hslToRgb(220, 30, 12); // Dark foreground

  // Background
  doc.setFillColor(...backgroundColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Border (matching brutal-shadow style)
  doc.setDrawColor(...foregroundColor);
  doc.setLineWidth(3);
  doc.rect(margin, margin, contentWidth, contentHeight);

  // Header Section with accent color
  doc.setFillColor(...accentColor);
  doc.rect(margin, margin, contentWidth, 40, 'F');
  
  // Border around header (brutal-shadow style)
  doc.setDrawColor(...foregroundColor);
  doc.setLineWidth(2);
  doc.rect(margin, margin, contentWidth, 40);

  // Logo/Title area
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('BOBPAY', margin + 10, margin + 25);

  // Certificate Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('MILESTONE PAYMENT CERTIFICATE', margin + 10, margin + 35);

  // Main Content
  doc.setTextColor(...foregroundColor);
  let yPos = margin + 60;

  // Project Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Information', margin + 10, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Project ID: ${data.projectId}`, margin + 10, yPos);
  yPos += 7;
  doc.text(`Project Title: ${data.projectTitle}`, margin + 10, yPos);
  yPos += 7;
  doc.text(`Milestone: ${data.milestoneNumber} - ${data.milestoneTitle}`, margin + 10, yPos);
  yPos += 15;

  // Payment Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Payment Information', margin + 10, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Amount Paid: $${data.amount.toLocaleString()}`, margin + 10, yPos);
  yPos += 7;
  if (data.verificationScore) {
    doc.text(`Verification Score: ${data.verificationScore}%`, margin + 10, yPos);
    yPos += 7;
  }
  doc.text(`Payment Date: ${new Date(data.timestamp).toLocaleDateString()}`, margin + 10, yPos);
  yPos += 15;

  // Parties Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Parties', margin + 10, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Freelancer: ${data.freelancerName}`, margin + 10, yPos);
  yPos += 7;
  doc.text(`Wallet: ${data.freelancerWallet}`, margin + 10, yPos);
  yPos += 7;
  doc.text(`Client: ${data.clientName}`, margin + 10, yPos);
  yPos += 7;
  doc.text(`Wallet: ${data.clientWallet}`, margin + 10, yPos);
  yPos += 15;

  // Blockchain Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Blockchain Verification', margin + 10, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Transaction Hash: ${data.transactionHash}`, margin + 10, yPos);
  yPos += 7;
  if (data.blockNumber) {
    doc.text(`Block Number: ${data.blockNumber}`, margin + 10, yPos);
    yPos += 7;
  }
  if (data.ipfsHash) {
    doc.text(`IPFS Hash: ${data.ipfsHash}`, margin + 10, yPos);
    yPos += 7;
    doc.text(`Certificate URL: ${getIPFSURL(data.ipfsHash)}`, margin + 10, yPos);
    yPos += 7;
  }
  if (data.deliverablesHash) {
    doc.text(`Deliverables Hash: ${data.deliverablesHash}`, margin + 10, yPos);
    yPos += 7;
  }

  // QR Code area (bottom right)
  const qrSize = 40;
  const qrX = pageWidth - margin - qrSize - 10;
  const qrY = pageHeight - margin - qrSize - 10;

  // Placeholder for QR code (you'll need to add QR code library)
  doc.setDrawColor(...foregroundColor);
  doc.setLineWidth(1);
  doc.rect(qrX, qrY, qrSize, qrSize);
  doc.setFontSize(8);
  doc.text('QR Code', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });

  // Footer
  const footerY = pageHeight - margin - 10;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Certificate ID: ${data.certificateId} | Generated on ${new Date().toLocaleString()}`,
    margin + 10,
    footerY,
    { align: 'left' }
  );

  // Generate PDF blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
};

/**
 * Generate certificate, upload to IPFS, and register on blockchain
 */
export const createAndRegisterCertificate = async (
  data: CertificateData
): Promise<{ certificateId: string; ipfsHash: string; transactionHash: string }> => {
  // Generate PDF
  const pdfBlob = await generateCertificatePDF(data);

  // Upload to IPFS
  const ipfsHash = await uploadToIPFS(
    pdfBlob,
    `certificate-${data.certificateId}.pdf`
  );

  // Register on blockchain
  const { certificateRegistry } = await import('./blockchain');
  const transactionHash = await certificateRegistry.registerCertificate(
    data.certificateId,
    data.projectId,
    data.milestoneId,
    ipfsHash,
    data.transactionHash || 'pending', // Will be updated with actual transaction hash
    data.freelancerWallet || 'N/A', // freelancerId
    data.clientWallet || 'N/A', // clientId
    String(data.amount || 0) // amount
  );

  return {
    certificateId: data.certificateId,
    ipfsHash,
    transactionHash,
  };
};
