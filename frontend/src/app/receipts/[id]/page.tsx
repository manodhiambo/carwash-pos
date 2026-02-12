'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer } from '@/components/layout/PageHeader';
import { Button, Card, Badge, Spinner, Separator } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { receiptsApi } from '@/lib/api';
import {
  ArrowLeft,
  Printer,
  Download,
  Send,
  Share2,
  Copy,
  CheckCircle,
  Car,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  jobNumber: string;
  date: string;

  business: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    vatNumber?: string;
  };

  customer: {
    name: string;
    phone: string;
  } | null;

  vehicle: {
    plate: string;
    make: string;
    model: string;
  };

  bay: string;
  attendant: string;
  cashier: string;

  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];

  subtotal: number;
  discount: number;
  discountReason?: string;
  taxRate: number;
  tax: number;
  total: number;

  payments: {
    method: string;
    amount: number;
    reference?: string;
    date: string;
  }[];

  amountPaid: number;
  change: number;
  balanceDue: number;

  footerMessage: string;
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const jobId = params.id as string;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipt();
  }, [jobId]);

  const fetchReceipt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await receiptsApi.generate(jobId, 'json');
      const data = response.data;

      // Map backend response to ReceiptData interface
      const services = data.services || [];
      const payments = data.payments || [];
      const amountPaid = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);

      setReceipt({
        id: jobId,
        receiptNumber: data.receipt_no || '',
        jobNumber: data.job_no || '',
        date: data.date || '',

        business: {
          name: data.business?.name || '',
          tagline: data.business?.tagline || '',
          address: data.business?.address || '',
          phone: data.business?.phone || '',
          email: data.business?.email || '',
        },

        customer: data.customer?.name && data.customer.name !== 'Walk-in'
          ? { name: data.customer.name, phone: data.customer.phone || '' }
          : null,

        vehicle: {
          plate: data.vehicle?.registration || 'N/A',
          make: data.vehicle?.make || '',
          model: data.vehicle?.model || '',
        },

        bay: data.bay || 'N/A',
        attendant: data.attendant || '',
        cashier: data.cashier || 'System',

        items: services.map((s: any) => ({
          name: s.name,
          quantity: s.quantity || 1,
          unitPrice: parseFloat(s.price || s.total || 0),
          total: parseFloat(s.total || 0),
        })),

        subtotal: data.subtotal || 0,
        discount: data.discount || 0,
        taxRate: data.tax_rate || 0,
        tax: data.tax || 0,
        total: data.total || 0,

        payments: payments.map((p: any) => ({
          method: (p.payment_method || '').replace('_', ' ').toUpperCase() || 'Cash',
          amount: parseFloat(p.amount || 0),
          reference: p.reference || undefined,
          date: p.created_at || '',
        })),

        amountPaid,
        change: Math.max(0, amountPaid - (data.total || 0)),
        balanceDue: Math.max(0, (data.total || 0) - amountPaid),

        footerMessage: data.footer || 'Thank you for your business!',
      });
    } catch (err: any) {
      console.error('Error fetching receipt:', err);
      setError(err?.error || 'Failed to load receipt');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receipt?.receiptNumber}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsApp = async () => {
    try {
      const response = await receiptsApi.getWhatsAppLink(jobId);
      window.open(response.data.whatsapp_url, '_blank');
    } catch (err: any) {
      toast.error(err?.error || 'Could not generate WhatsApp link. Customer may not have a phone number.');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-96">
            <Spinner size="lg" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (error || !receipt) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center h-96">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Receipt Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || "The receipt you're looking for doesn't exist."}
            </p>
            <Button onClick={() => router.push('/jobs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title={`Receipt ${receipt.receiptNumber}`}
          description={`Job ${receipt.jobNumber}`}
          backLink={`/jobs/${jobId}`}
        >
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </PageHeader>

        <div className="max-w-md mx-auto">
          {/* Receipt Card */}
          <Card className="p-0 overflow-hidden" ref={receiptRef}>
            {/* Print-friendly receipt */}
            <div className="bg-white text-black p-6 print:p-4">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="text-3xl mb-1">🚗</div>
                <h1 className="text-xl font-bold">{receipt.business.name}</h1>
                <p className="text-sm text-gray-600">{receipt.business.tagline}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <p>{receipt.business.address}</p>
                  <p>Tel: {receipt.business.phone}</p>
                  <p>Email: {receipt.business.email}</p>
                </div>
              </div>

              {/* Receipt Info */}
              <div className="border-t border-b border-dashed border-gray-300 py-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Receipt #:</span>
                  <span className="font-medium">{receipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Job #:</span>
                  <span>{receipt.jobNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span>{receipt.date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cashier:</span>
                  <span>{receipt.cashier}</span>
                </div>
              </div>

              {/* Customer & Vehicle Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-4 w-4" />
                  <span className="font-mono font-bold">{receipt.vehicle.plate}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {receipt.vehicle.make} {receipt.vehicle.model}
                </div>
                {receipt.customer && (
                  <div className="text-sm mt-1">
                    <span className="text-gray-600">Customer: </span>
                    {receipt.customer.name}
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-gray-600">Bay: </span>
                  {receipt.bay}
                  {receipt.attendant && (
                    <>
                      {' | '}<span className="text-gray-600">Attendant: </span>
                      {receipt.attendant}
                    </>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-dashed border-gray-300 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="text-left font-normal">Item</th>
                      <th className="text-center font-normal w-12">Qty</th>
                      <th className="text-right font-normal w-20">Price</th>
                      <th className="text-right font-normal w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-1">{item.name}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{item.unitPrice.toLocaleString()}</td>
                        <td className="text-right">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-300 py-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>KES {receipt.subtotal.toLocaleString()}</span>
                </div>
                {receipt.discount > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-KES {receipt.discount.toLocaleString()}</span>
                    </div>
                    {receipt.discountReason && (
                      <div className="text-xs text-gray-500 pl-2">{receipt.discountReason}</div>
                    )}
                  </>
                )}
                {receipt.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>VAT ({receipt.taxRate}%)</span>
                    <span>KES {receipt.tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>TOTAL</span>
                  <span>KES {receipt.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payments */}
              <div className="border-t border-dashed border-gray-300 py-3">
                <div className="text-sm font-medium mb-2">Payment Details</div>
                {receipt.payments.map((payment, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <span>{payment.method}</span>
                      {payment.reference && (
                        <span className="text-gray-500 text-xs ml-1">({payment.reference})</span>
                      )}
                    </div>
                    <span>KES {payment.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                  <span>Amount Paid</span>
                  <span className="font-medium">KES {receipt.amountPaid.toLocaleString()}</span>
                </div>
                {receipt.change > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Change</span>
                    <span>KES {receipt.change.toLocaleString()}</span>
                  </div>
                )}
                {receipt.balanceDue > 0 && (
                  <div className="flex justify-between text-sm text-red-600 font-medium">
                    <span>Balance Due</span>
                    <span>KES {receipt.balanceDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Barcode Placeholder */}
              <div className="text-center py-4">
                <div className="inline-block bg-gray-100 px-8 py-2 rounded">
                  <div className="text-xs font-mono tracking-widest">
                    ||| || ||| || || ||| || |||
                  </div>
                  <div className="text-xs mt-1">{receipt.receiptNumber}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 border-t border-dashed border-gray-300 pt-4">
                <p className="mb-2">{receipt.footerMessage}</p>
                {receipt.business.vatNumber && (
                  <p>VAT Reg No: {receipt.business.vatNumber}</p>
                )}
                <p className="mt-2">Powered by CARWASH-POS</p>
              </div>
            </div>
          </Card>

          {/* Action Buttons (hidden on print) */}
          <div className="flex justify-center gap-4 mt-6 print:hidden">
            <Button variant="outline" onClick={() => router.push(`/jobs/${jobId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </PageContainer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #receipt-card,
          #receipt-card * {
            visibility: visible;
          }
          #receipt-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
        }
      `}</style>
    </MainLayout>
  );
}
