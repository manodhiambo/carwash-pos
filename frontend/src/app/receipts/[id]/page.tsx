'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer } from '@/components/layout/PageHeader';
import { Button, Card, Badge, Spinner, Separator } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
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
} from 'lucide-react';

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
    type: string;
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

  loyaltyPointsEarned: number;
  loyaltyPointsBalance: number;

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

  useEffect(() => {
    fetchReceipt();
  }, [jobId]);

  const fetchReceipt = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock receipt data
      setReceipt({
        id: jobId,
        receiptNumber: 'RCP-2024-0156',
        jobNumber: 'J-2024-0156',
        date: '2024-02-18T15:30:00Z',

        business: {
          name: 'Sparkle Car Wash',
          tagline: 'Where Every Car Shines',
          address: 'Moi Avenue, Nairobi, Kenya',
          phone: '+254 712 345 678',
          email: 'info@sparklecarwash.co.ke',
          vatNumber: 'P051234567X',
        },

        customer: {
          name: 'John Kamau',
          phone: '+254 712 345 678',
        },

        vehicle: {
          plate: 'KDA 123A',
          make: 'Toyota',
          model: 'Camry',
          type: 'Sedan',
        },

        bay: 'Bay 1',
        attendant: 'Peter Ochieng',
        cashier: 'Mary Wanjiku',

        items: [
          { name: 'Full Service Wash', quantity: 1, unitPrice: 1200, total: 1200 },
          { name: 'Interior Vacuum', quantity: 1, unitPrice: 300, total: 300 },
          { name: 'Dashboard Polish', quantity: 1, unitPrice: 200, total: 200 },
        ],

        subtotal: 1700,
        discount: 170,
        discountReason: 'Loyalty Discount (10%)',
        taxRate: 16,
        tax: 245,
        total: 1775,

        payments: [
          {
            method: 'M-Pesa',
            amount: 1775,
            reference: 'QKH7J2K9LP',
            date: '2024-02-18T15:28:00Z',
          },
        ],

        amountPaid: 1775,
        change: 0,
        balanceDue: 0,

        loyaltyPointsEarned: 17,
        loyaltyPointsBalance: 1262,

        footerMessage: 'Thank you for choosing Sparkle Car Wash! We appreciate your business. Drive clean, drive happy!',
      });
    } catch (error) {
      console.error('Error fetching receipt:', error);
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

  const handleSendSMS = () => {
    // API call to send SMS would go here
    alert('SMS sent successfully!');
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

  if (!receipt) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center h-96">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Receipt Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The receipt you're looking for doesn't exist.
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
          {receipt.customer && (
            <Button variant="outline" size="sm" onClick={handleSendSMS}>
              <Send className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
          )}
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
                  <span>{formatDate(receipt.date, true)}</span>
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
                  {receipt.vehicle.make} {receipt.vehicle.model} ({receipt.vehicle.type})
                </div>
                {receipt.customer && (
                  <div className="text-sm mt-1">
                    <span className="text-gray-600">Customer: </span>
                    {receipt.customer.name}
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-gray-600">Bay: </span>
                  {receipt.bay} | <span className="text-gray-600">Attendant: </span>
                  {receipt.attendant}
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
                <div className="flex justify-between text-sm">
                  <span>VAT ({receipt.taxRate}%)</span>
                  <span>KES {receipt.tax.toLocaleString()}</span>
                </div>
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

              {/* Loyalty Points */}
              {receipt.loyaltyPointsEarned > 0 && (
                <div className="border-t border-dashed border-gray-300 py-3 bg-yellow-50 -mx-6 px-6 my-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-yellow-600">★</span>
                    <span>
                      You earned <strong>{receipt.loyaltyPointsEarned}</strong> loyalty points!
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    New balance: {receipt.loyaltyPointsBalance.toLocaleString()} points
                  </div>
                </div>
              )}

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
