import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Download } from 'lucide-react';

interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number;
  ownerUsername: string;
  ownerPassword: string;
}

interface QRCodeModalProps {
  cafe: Cafe;
  onClose: () => void;
}

const QRCodeModal = ({ cafe, onClose }: QRCodeModalProps) => {
  const handlePrint = () => {
    window.print();
  };

  // 1. Get the Customer App's domain from an environment variable.
  // This must be set on the Vercel dashboard for your Management project.
  const CUSTOMER_APP_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'http://localhost:8081'|| 'https://bay-order.vercel.app';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>QR Codes for {cafe.name}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:space-y-8">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">Owner Credentials</h3>
            <p className="text-sm"><span className="font-medium">Username:</span> {cafe.ownerUsername}</p>
            <p className="text-sm"><span className="font-medium">Password:</span> {cafe.ownerPassword}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
            {Array.from({ length: cafe.tableCount }, (_, i) => {
              const tableId = `T${i + 1}`;
              
              // 2. Construct the full URL string as the QR code value.
              // Example: https://bay-serve.com/order?cafeId=abc1234&tableId=T1
              const qrData = `${CUSTOMER_APP_URL}/order?cafeId=${cafe.id}&tableId=${tableId}`;

              return (
                <div
                  key={tableId}
                  className="border-2 border-primary rounded-lg p-4 flex flex-col items-center gap-3 print:border-black"
                >
                  <QRCodeSVG
                    value={qrData} // Now encodes the full URL string
                    size={140}
                    level="H"
                    includeMargin={true}
                  />
                  <div className="text-center">
                    <p className="font-semibold text-lg">{cafe.name}</p>
                    <p className="text-xl font-bold text-primary print:text-black">Table {i + 1}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handlePrint} className="w-full print:hidden">
            <Download className="h-4 w-4 mr-2" />
            Print QR Codes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;