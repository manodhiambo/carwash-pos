'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { receiptsApi } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  Spinner,
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { Printer, Share2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReceiptDialogProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptDialog({ jobId, isOpen, onClose }: ReceiptDialogProps) {
  const [isSending, setIsSending] = useState(false);

  const { data: receiptData, isLoading } = useQuery({
    queryKey: ['receipt', jobId],
    queryFn: () => receiptsApi.generate(jobId, 'json'),
    enabled: isOpen && !!jobId,
  });

  const receipt = receiptData?.data;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = async () => {
    setIsSending(true);
    try {
      const response = await receiptsApi.getWhatsAppLink(jobId);
      const { whatsapp_url } = response.data;
      
      // Open WhatsApp in new window
      window.open(whatsapp_url, '_blank');
      toast.success('Opening WhatsApp...');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate WhatsApp link');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    if (!receipt) return;
    
    // Generate text receipt
    const lines: string[] = [];
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(receipt.business.name);
    if (receipt.business.tagline) lines.push(receipt.business.tagline);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push(`Receipt #: ${receipt.receipt_no}`);
    lines.push(`Date: ${receipt.date}`);
    lines.push(`Cashier: ${receipt.cashier}`);
    lines.push('');
    
    if (receipt.customer.name !== 'Walk-in') {
      lines.push(`Customer: ${receipt.customer.name}`);
      lines.push('');
    }
    
    if (receipt.vehicle.registration !== 'N/A') {
      lines.push(`Vehicle: ${receipt.vehicle.registration}`);
      lines.push('');
    }
    
    lines.push('SERVICES');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    receipt.services.forEach((service: any) => {
      lines.push(`${service.name} - ${formatCurrency(service.total)}`);
    });
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push(`Subtotal: ${formatCurrency(receipt.subtotal)}`);
    if (receipt.discount > 0) lines.push(`Discount: -${formatCurrency(receipt.discount)}`);
    if (receipt.tax > 0) lines.push(`Tax: ${formatCurrency(receipt.tax)}`);
    lines.push(`TOTAL: ${formatCurrency(receipt.total)}`);
    
    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receipt.receipt_no}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Receipt downloaded');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center px-6 py-8">
            <Spinner size="lg" />
          </div>
        ) : receipt ? (
          <>
          <DialogBody>
            {/* Receipt Preview */}
            <div className="border rounded-lg p-4 bg-white text-sm font-mono">
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg">{receipt.business.name}</h3>
                {receipt.business.tagline && (
                  <p className="text-xs text-muted-foreground">{receipt.business.tagline}</p>
                )}
                <div className="text-xs mt-2 text-muted-foreground">
                  {receipt.business.address && <p>{receipt.business.address}</p>}
                  {receipt.business.phone && <p>Tel: {receipt.business.phone}</p>}
                </div>
              </div>

              <div className="border-t border-b py-2 mb-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Receipt #:</span>
                  <span className="font-semibold">{receipt.receipt_no}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{receipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{receipt.cashier}</span>
                </div>
                {receipt.customer.name !== 'Walk-in' && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{receipt.customer.name}</span>
                  </div>
                )}
                {receipt.vehicle.registration !== 'N/A' && (
                  <div className="flex justify-between">
                    <span>Vehicle:</span>
                    <span>{receipt.vehicle.registration}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-3">
                <p className="font-semibold text-xs">SERVICES</p>
                {receipt.services.map((service: any, index: number) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span>{service.name}</span>
                    <span>{formatCurrency(service.total)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(receipt.discount)}</span>
                  </div>
                )}
                {receipt.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({receipt.tax_rate}%):</span>
                    <span>{formatCurrency(receipt.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
              </div>

              {receipt.payments && receipt.payments.length > 0 && (
                <div className="mt-3 pt-3 border-t text-xs">
                  <p className="font-semibold mb-1">PAYMENT</p>
                  {receipt.payments.map((payment: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center mt-4 pt-4 border-t text-xs text-muted-foreground">
                <p>Thank you for your business! 🚗✨</p>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              disabled={isSending || !receipt.customer.phone}
            >
              <Share2 className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
          </>
        ) : (
          <p className="text-center text-muted-foreground px-6 py-8">
            No receipt data available
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
