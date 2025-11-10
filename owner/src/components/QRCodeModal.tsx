import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { QRCodeCanvas } from 'qrcode.react'; // Use default import

// This is the normal Cafe type (no passwords)
interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number;
  ownerUserId: string;
  tableStatus: Record<string, string>;
}

// Props for the modal
interface QRCodeModalProps {
  cafe: Cafe;
  tableId: string;
}

const QRCodeModal = ({ cafe, tableId }: QRCodeModalProps) => {
  // This is the URL for your CUSTOMER app
  const customerAppUrl = import.meta.env.VITE_CUSTOMER_APP_URL || "https://bay-order.vercel.app";
  
  // Use the correct URL structure with path params
  const qrUrl = `${customerAppUrl}/order/order?cafeId=${cafe.id}&tableId=${tableId}`;

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${cafe.name.replace(/\s+/g, '_')}_${tableId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            QR Code for: {tableId}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="rounded-lg border p-4">
            <QRCodeCanvas
              id="qr-code-canvas"
              value={qrUrl}
              size={256}
              level={"H"}
              includeMargin={true}
            />
          </div>
          <p className="max-w-xs break-all text-center text-xs text-muted-foreground">
            {qrUrl}
          </p>
          <Button onClick={downloadQRCode} className="w-full">
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;