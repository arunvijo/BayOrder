import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, Package, Hand } from 'lucide-react'; // <-- BellRing removed
import { toast } from 'sonner';

// --- Types (from CustomerApp) ---
interface Customization {
  modifierName: string;
  selection: string | string[];
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customizations?: Customization[];
}

// --- Order status now matches CustomerApp ---
type OrderStatus = 'Pending' | 'Preparing' | 'Ready for Delivery' | 'Paid';

interface Order {
  id: string;
  cafeId: string;
  tableId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: any;
}

// --- Map for the new Select dropdown ---
const STATUS_OPTIONS: { value: OrderStatus; label: string; icon: React.ElementType }[] = [
  { value: 'Pending', label: 'Pending', icon: Clock },
  { value: 'Preparing', label: 'Preparing', icon: Package },
  { value: 'Ready for Delivery', label: 'Ready', icon: Hand },
  { value: 'Paid', label: 'Paid', icon: CheckCircle2 },
];

interface LiveOrdersTabProps {
  cafeId: string;
  tableStatus: Record<string, string>;
}

const LiveOrdersTab = ({ cafeId, tableStatus }: LiveOrdersTabProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  // const [alerts, setAlerts] = useState<Alert[]>([]); // <-- REMOVED

  // --- 1. Listener for Live Orders ---
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where('cafeId', '==', cafeId),
      where('status', '!=', 'Paid'), // Show all orders that are not yet paid
      orderBy('status', 'asc'), // Show 'Pending' orders first
      orderBy('createdAt', 'asc') // Then show oldest first (kitchen queue)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [cafeId]);

  // --- 2. Listener for Alerts (REMOVED) ---

  // --- 3. Handler to update order status ---
  const handleUpdateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, "orders", order.id);
      
      const updates: any = { status: newStatus };

      // If marking as Paid, update table status to Vacant
      if (newStatus === 'Paid') {
        updates.paidAt = serverTimestamp();
        
        const cafeRef = doc(db, "cafes", cafeId);
        await updateDoc(cafeRef, {
          [`tableStatus.${order.tableId}`]: 'Vacant'
        });
        toast.success(`Table ${order.tableId} marked as Paid and Vacant.`);
      } else {
        toast.success(`Order for Table ${order.tableId} set to ${newStatus}.`);
      }
      
      await updateDoc(orderRef, updates);

    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order');
    }
  };

  // --- 4. Handler to dismiss alerts (REMOVED) ---

  return (
    <div className="space-y-6">

      {/* --- New Alerts Section (REMOVED) --- */}

      {/* --- Table Status Section (No change) --- */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Table Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {Object.entries(tableStatus).map(([tableId, status]) => (
              <div
                key={tableId}
                className={`
                  aspect-square rounded-lg flex items-center justify-center font-semibold
                  transition-smooth cursor-default
                  ${status === 'Vacant' 
                    ? 'bg-success/10 text-success border-2 border-success/20' 
                    : 'bg-destructive/10 text-destructive border-2 border-destructive/20'
                  }
                `}
              >
                {tableId}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/10 border-2 border-success/20" />
              <span>Vacant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/10 border-2 border-destructive/20" />
              <span>Occupied</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Live Orders Section (Upgraded) --- */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Live Orders
        </h2>
        {orders.length === 0 ? (
          <Card className="shadow-elegant">
            <CardContent className="py-12 text-center text-muted-foreground">
              No active orders at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => (
              <Card 
                key={order.id} 
                className={`shadow-elegant hover:shadow-elegant-lg transition-smooth ${
                  order.status === 'Pending' ? 'border-2 border-yellow-500' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Table {order.tableId}
                    </CardTitle>
                    <Badge variant={order.status === 'Pending' ? 'destructive' : 'secondary'}>
                      {order.createdAt ? order.createdAt.toDate().toLocaleTimeString() : '...'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm border-b border-dashed last:border-none pb-2 last:pb-0">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.quantity}x {item.name}</span>
                          <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        
                        {item.customizations && item.customizations.length > 0 && (
                          <ul className="list-disc list-inside pl-4 mt-1 text-muted-foreground text-xs">
                            {item.customizations.map((cust, cIdx) => (
                              <li key={cIdx}>
                                <strong>{cust.modifierName}:</strong> {Array.isArray(cust.selection) ? cust.selection.join(', ') : cust.selection}
                              </li>
                            ))}
                          </ul>
                        )}
                        
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-semibold text-lg">Total:</span>
                    <span className="font-bold text-xl text-primary">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* --- New Status Select Dropdown --- */}
                  <div className="space-y-2">
                    <Label htmlFor={`status-select-${order.id}`}>Update Order Status</Label>
                    <Select 
                      value={order.status} 
                      onValueChange={(newStatus: OrderStatus) => handleUpdateOrderStatus(order, newStatus)}
                    >
                      <SelectTrigger id={`status-select-${order.id}`} className="w-full">
                        <SelectValue placeholder="Change status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveOrdersTab;