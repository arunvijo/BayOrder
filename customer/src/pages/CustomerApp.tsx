import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  writeBatch,
  Unsubscribe,
  limit,
  orderBy,
  serverTimestamp, // Correctly imported from firestore
  addDoc // Added import
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  ShoppingCart, Plus, Minus, Trash2, Loader2, AlertCircle, Bell, Clock, 
  Package, CheckCircle, RefreshCw, Hand, Coffee
} from 'lucide-react';

// --- Type Definitions (from MenuManagementTab) ---
interface Modifiers {
  type: 'radio' | 'checkbox' | 'note';
  name: string;
  options: { label: string; price?: number }[];
}

interface MenuItem {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  modifiers?: Modifiers[];
  imageUrl?: string; // <-- ADD THIS LINE
}

interface Cafe {
  id: string;
  name: string;
  address: string;
  tableStatus: Record<string, string>;
}

interface Customization {
  modifierName: string;
  selection: string | string[];
  priceAdjustment: number;
}

interface CartItem extends MenuItem {
  quantity: number;
  customizations: Customization[];
  uniqueId: string; // To differentiate items with same base ID but different customizations
}

interface Order {
    id: string;
    cafeId: string;
    tableId: string;
    items: any[];
    total: number;
    status: 'Pending' | 'Preparing' | 'Ready for Delivery' | 'Paid';
    createdAt: any; // Can be a server timestamp
}

// --- Status Map for UI ---
const ORDER_STATUS_MAP = {
    'Pending': { icon: Clock, color: 'text-yellow-500', label: 'Order Sent', step: 1 },
    'Preparing': { icon: Package, color: 'text-blue-500', label: 'Being Prepared', step: 2 },
    'Ready for Delivery': { icon: Hand, color: 'text-primary', label: 'Ready for Delivery', step: 3 },
    'Paid': { icon: CheckCircle, color: 'text-success', label: 'Order Complete', step: 4 }
};

const CustomerApp = () => {
  const [searchParams] = useSearchParams();
  
  const [cafeId] = useState(searchParams.get('cafeId') || '');
  const [tableId] = useState(searchParams.get('tableId') || '');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [itemToCustomize, setItemToCustomize] = useState<MenuItem | null>(null);

  // --- 1. Firebase Authentication & Paths ---
  useEffect(() => {
    signInAnonymously(auth).then(() => {
      setAuthenticated(true);
    }).catch((err) => {
      setError('Authentication failed. Please check network.');
      console.error('Auth error:', err);
    });

    if (!cafeId || !tableId) {
        setError('Invalid QR code. Missing cafe or table information.');
        setLoading(false);
    }
  }, [cafeId, tableId]);

  // --- 2. Data Listeners & Order Tracking ---
  useEffect(() => {
    if (!authenticated || !cafeId || error) return;

    let unsubscribeCafe: Unsubscribe | undefined;
    let unsubscribeMenu: Unsubscribe | undefined;
    
    // 1. Cafe Listener
    const cafeRef = doc(db, "cafes", cafeId);
    unsubscribeCafe = onSnapshot(cafeRef, (docSnap) => {
      if (docSnap.exists()) {
        setCafe({ id: docSnap.id, ...docSnap.data() } as Cafe);
      } else {
        setError(`Cafe ID "${cafeId}" not found.`);
        setLoading(false);
      }
    }, (e) => {
      console.error("Error fetching cafe:", e);
      setError("Failed to load cafe details.");
      setLoading(false);
    });

    // 2. Menu Listener
    const menuQuery = query(
      collection(db, "menuItems"),
      where('cafeId', '==', cafeId),
      where('available', '==', true) // Only fetch available items
    );
    unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const items: MenuItem[] = snapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data()
      } as MenuItem));
      
      items.sort((a, b) => a.category.localeCompare(b.category));
      setMenuItems(items);
      setLoading(false);
    }, (e) => {
      console.error("Error fetching menu:", e);
      setError("Failed to load menu.");
      setLoading(false);
    });

    // 3. Latest Order Listener (NEW)
    const ordersPath = "orders";
    const orderQuery = query(
        collection(db, ordersPath),
        where('cafeId', '==', cafeId),
        where('tableId', '==', tableId),
        orderBy('createdAt', 'desc'),
        limit(1)
    );

    const unsubscribeOrders = onSnapshot(orderQuery, (snapshot) => {
        if (!snapshot.empty) {
            const latest = snapshot.docs[0].data() as Order;
            // --- FIX: Only set latestOrder if it's not Paid, or if it just BECAME Paid ---
            if (latest.status !== 'Paid') {
                setLatestOrder({ id: snapshot.docs[0].id, ...latest });
            } else if (latestOrder?.status !== 'Paid' && latest.status === 'Paid') {
                // The order we were tracking just got paid, show the "Complete" message
                setLatestOrder({ id: snapshot.docs[0].id, ...latest });
            } else if (latestOrder?.status === 'Paid' && latest.status === 'Paid') {
                // A paid order is the latest, but we aren't tracking one, so set to null
                setLatestOrder(null);
            }
        } else {
            setLatestOrder(null);
        }
    }, (err) => console.error("Order listener error:", err));


    return () => {
        if (unsubscribeCafe) unsubscribeCafe();
        if (unsubscribeMenu) unsubscribeMenu();
        if (unsubscribeOrders) unsubscribeOrders();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, cafeId, tableId, error]);


  // --- 3. Cart & Customization Logic ---
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // --- FIX (Request 2): Create a map for simple items already in cart ---
  const simpleCartItemMap = useMemo(() => {
    const map: Record<string, CartItem> = {};
    for (const item of cart) {
      // Only map items that have no customizations
      if (!item.customizations || item.customizations.length === 0) {
        map[item.id] = item;
      }
    }
    return map;
  }, [cart]);

  const handleAddItemClick = (item: MenuItem) => {
      if (item.modifiers && item.modifiers.length > 0) {
          setItemToCustomize(item);
      } else {
          // --- FIX (Request 2): Check if simple item is already in cart ---
          const existingCartItem = simpleCartItemMap[item.id];
          if (existingCartItem) {
            // If it is, just increase its quantity
            updateQuantity(existingCartItem.uniqueId, 1);
          } else {
            // Otherwise, add it as a new item
            addToCartDirectly(item, []);
          }
      }
  };

  const addToCartDirectly = (item: MenuItem, customizations: Customization[], notes?: string) => {
    const totalCustomPrice = customizations.reduce((sum, c) => sum + (c.priceAdjustment || 0), 0);
    const itemWithCustomizations: CartItem = { 
        ...item, 
        quantity: 1,
        customizations: [...customizations, ...(notes ? [{ modifierName: 'Notes', selection: notes, priceAdjustment: 0 }] : [])],
        price: item.price + totalCustomPrice, // Update the price for this instance
        uniqueId: `${item.id}-${Date.now()}` // Ensures uniqueness
    };

    setCart(prev => [...prev, itemWithCustomizations]);
    toast.success(`${item.name} added to cart!`, { duration: 1500 });
    setItemToCustomize(null); // Close modal
  };

  const updateQuantity = (uniqueId: string, delta: number) => {
    setCart(prevCart => {
      const newCart = prevCart.map(i => 
          i.uniqueId === uniqueId ? { ...i, quantity: i.quantity + delta } : i
      ).filter(i => i.quantity > 0);
      
      if (newCart.length === 0) setIsCartOpen(false);
      return newCart;
    });
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => prev.filter(item => item.uniqueId !== uniqueId));
  };


  // --- 4. Advanced Customer Actions ---

  const handleCallServer = async () => {
    try {
      const requestsRef = collection(db, "requests");
      
      await addDoc(requestsRef, {
        cafeId,
        tableId,
        type: 'server-call',
        status: 'new',
        createdAt: serverTimestamp(),
      });

      toast.info(`Staff have been notified for Table ${tableId}.`, { duration: 3000 });

    } catch (e) {
      console.error("Error sending request:", e);
      toast.error("Failed to call server. Please try again.", { duration: 3000 });
    }
  };

  const handleReorder = async () => {
      if (!latestOrder) return;
      
      const itemsToReorder: CartItem[] = latestOrder.items.map((item: any, index: number) => {
          // Find the base item from the current menu
          const baseMenuItem = menuItems.find(m => m.id === item.id);
          
          return {
              ...(baseMenuItem || item), // Use fresh menu item data if available
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              customizations: item.customizations || [], // Use existing customizations
              uniqueId: `${item.id}-${Date.now()}-${index}`,
              price: item.price, // Use the price from the *previous* order
          };
      });
      
      setCart(itemsToReorder);
      setIsCartOpen(true);
      toast.success("Your previous order has been added to the cart.", { duration: 2000 });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || placingOrder) return;

    setPlacingOrder(true);
    
    try {
      const batch = writeBatch(db);
      const ordersRef = collection(db, "orders");
      const cafeRef = doc(db, "cafes", cafeId);

      const orderRef = doc(ordersRef);
      batch.set(orderRef, {
        cafeId,
        tableId,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          customizations: item.customizations || []
        })),
        total: cartTotal,
        status: 'Pending', 
        createdAt: serverTimestamp(),
      });

      batch.update(cafeRef, {
          [`tableStatus.${tableId}`]: 'Occupied'
      });

      await batch.commit();

      setCart([]);
      setIsCartOpen(false);
      setShowSuccessModal(true); // Trigger the clean modal
      
    } catch (e) {
      console.error("Error placing order:", e);
      toast.error("Order Failed! Please check connectivity or call staff.", { duration: 3000 });
    } finally {
      setPlacingOrder(false);
    }
  };


  // --- 5. UI Components & Render Logic ---

  // Custom component for Item Customization Modal
  const ItemCustomizationModal = ({ item, onClose }: { item: MenuItem, onClose: () => void }) => {
    const [currentCustoms, setCurrentCustoms] = useState<Customization[]>([]);
    const [notes, setNotes] = useState('');
    
    // Note: This is a simplified calculation. A real one would check modifier types.
    const currentPrice = item.price + currentCustoms.reduce((sum, c) => sum + (c.priceAdjustment || 0), 0);

    const handleSave = () => {
        addToCartDirectly(item, currentCustoms, notes);
        onClose();
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md" onClick={e => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="text-2xl">{item.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground pt-1">{item.description}</p>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {/* Simplified Customization UI */}
                    {item.modifiers?.map(mod => (
                        <div key={mod.name} className="border-t pt-3">
                            <Label className="text-lg font-semibold">{mod.name}</Label>
                            {/* Radio/Checkbox groups would go here, updating currentCustoms state */}
                            <p className="text-sm text-muted-foreground">
                                {mod.options.map(opt => opt.label).join(', ')}
                            </p>
                        </div>
                    ))}
                    <div>
                        <Label htmlFor="notes" className="text-lg font-semibold">Special Notes</Label>
                        <Textarea 
                            id="notes" 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            className="w-full mt-2"
                            placeholder="e.g., Decaf, extra hot, light ice..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-2xl font-bold">Total: ${currentPrice.toFixed(2)}</span>
                        <Button onClick={handleSave} size="lg">
                            Add to Cart
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
  };
    
  // UI for tracking the order after placement
  const OrderTrackerView = () => {
      // --- FIX (Request 1): Don't render if there's no order ---
      if (!latestOrder) return null;
      
      if (latestOrder.status === 'Paid') {
          return (
              <Card className="text-center p-8 bg-success/10 shadow-lg border-success/20">
                  <CheckCircle className="h-10 w-10 text-success mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-success">Order Complete!</h2>
                  <p className="text-muted-foreground">Thank you! Your table is now vacant.</p>
                  <Button onClick={() => setLatestOrder(null)} className="mt-4">
                      Start New Order
                  </Button>
              </Card>
          );
      }

      const currentStatus = ORDER_STATUS_MAP[latestOrder.status || 'Pending'];
      const progressPercent = (currentStatus.step / 3) * 100; // 3 steps before complete

      return (
          <div className="space-y-6">
              <Card className="shadow-lg border-2 border-primary/50">
                  <CardHeader>
                      <CardTitle className="flex items-center text-primary">
                          <Clock className="h-6 w-6 mr-2" />
                          Tracking Your Order
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                      <div className="space-y-3 mb-4">
                          <p className="text-lg font-semibold flex items-center gap-2">
                              <currentStatus.icon className={`h-5 w-5 ${currentStatus.color}`} />
                              Current Status: {currentStatus.label}
                          </p>
                          <div className="w-full bg-muted rounded-full h-2.5">
                              <div 
                                  className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                                  style={{ width: `${progressPercent}%` }}
                              />
                          </div>
                      </div>
                      
                      <Separator className="my-4" />

                      <h4 className="font-semibold mb-2">Order Summary</h4>
                      <ScrollArea className="max-h-40 overflow-y-auto pr-2">
                        <ul className="text-sm space-y-2">
                            {latestOrder.items.map((item: any, index: number) => (
                                <li key={index} className="flex justify-between items-start">
                                    <span className="flex-1 pr-2">{item.quantity}x {item.name}</span>
                                    <span className="font-medium">${item.price.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                      </ScrollArea>
                      
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                           <span className="text-lg font-bold">Total:</span>
                           <span className="text-2xl font-bold text-primary">${latestOrder.total.toFixed(2)}</span>
                      </div>
                  </CardContent>
              </Card>
              
              <div className="flex justify-center items-center gap-4">
                  <p className="text-center text-sm text-muted-foreground">
                      Your order is being prepared.
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleReorder}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reorder
                  </Button>
              </div>
          </div>
      );
  };

  const LoadingView = () => (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading menu for {cafe?.name || 'your cafe'}...</p>
        </div>
      </div>
  );

  const ErrorView = () => (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-xl border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Load Menu</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );

  // --- MAIN RENDER ---
  if (loading) return <LoadingView />;
  if (error) return <ErrorView />;
  
  const groupedItems = menuItems.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
      <div className="min-h-screen bg-background pb-24">
          
          {/* Confirmation Modal */}
          <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
              <AlertDialogContent>
                  <AlertDialogHeader className="text-center">
                      <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                      <AlertDialogTitle className="text-2xl">Order Placed!</AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                          Your order has been sent to the kitchen.
                          <br/>Payment is <strong>Cash Only</strong> upon delivery to Table {tableId}.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="sm:justify-center">
                      <AlertDialogAction onClick={() => setShowSuccessModal(false)}>
                          Track My Order
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          
          {/* Customization Modal */}
          {itemToCustomize && <ItemCustomizationModal item={itemToCustomize} onClose={() => setItemToCustomize(null)} />}

          {/* Cart Sheet */}
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
                  <SheetHeader>
                      <SheetTitle className="text-2xl">Your Order</SheetTitle>
                  </SheetHeader>
                  
                  {cart.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                          <p className="text-muted-foreground">Your cart is empty.</p>
                      </div>
                  ) : (
                      <>
                          <ScrollArea className="flex-1 -mx-6 px-6 mt-6">
                              <div className="space-y-4">
                                  {cart.map((item) => (
                                      <Card key={item.uniqueId}>
                                          <CardContent className="p-4 flex gap-4">
                                              <div className="flex-1">
                                                  <h4 className="font-semibold">{item.name}</h4>
                                                  <p className="text-sm text-muted-foreground">
                                                      {item.customizations.map(c => c.selection).join(', ')}
                                                  </p>
                                                  <p className="text-primary font-medium">${item.price.toFixed(2)} each</p>
                                                  <div className="flex items-center gap-2 mt-2">
                                                      <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => updateQuantity(item.uniqueId, -1)}
                                                      >
                                                          <Minus className="h-4 w-4" />
                                                      </Button>
                                                      <span className="w-8 text-center font-medium">
                                                          {item.quantity}
                                                      </span>
                                                      <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => updateQuantity(item.uniqueId, 1)}
                                                      >
                                                          <Plus className="h-4 w-4" />
                                                      </Button>
                                                  </div>
                                              </div>
                                              <div className="flex flex-col items-end justify-between">
                                                  <p className="font-bold text-lg text-primary">
                                                      ${(item.price * item.quantity).toFixed(2)}
                                                  </p>
                                                  <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => removeFromCart(item.uniqueId)}
                                                      className="text-destructive hover:text-destructive"
                                                  >
                                                      <Trash2 className="h-4 w-4" />
                                                  </Button>
                                              </div>
                                          </CardContent>
                                      </Card>
                                  ))}
                              </div>
                          </ScrollArea>
                          
                          <div className="mt-auto pt-6 border-t space-y-4">
                              <div className="flex justify-between items-center text-lg">
                                  <span className="font-semibold">Total</span>
                                  <span className="font-bold text-primary text-2xl">
                                      ${cartTotal.toFixed(2)}
                                  </span>
                              </div>
                              <Button
                                  onClick={handlePlaceOrder}
                                  disabled={placingOrder || cart.length === 0}
                                  className="w-full h-12 text-lg"
                                  size="lg"
                              >
                                  {placingOrder ? (
                                      <>
                                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                          Placing Order...
                                      </>
                                  ) : (
                                      'Place Order Now'
                                  )}
                              </Button>
                              <p className="text-xs text-center text-muted-foreground">
                                  Payment is <strong>Cash Only</strong> upon delivery to Table {tableId}
                              </p>
                          </div>
                      </>
                  )}
              </SheetContent>
          </Sheet>

          {/* Fixed Header */}
          <header className="sticky top-0 z-40 bg-background shadow-md">
              <div className="container mx-auto px-4 py-4">
                  <div className="flex items-center justify-between">
                      <div>
                          <h1 className="text-xl font-bold">{cafe?.name || 'BayServe'}</h1>
                          <p className="text-sm text-muted-foreground">Table: {tableId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button 
                              variant="outline" 
                              size="icon"
                              onClick={handleCallServer}
                              className="text-primary border-primary/50 hover:bg-primary/10"
                              aria-label="Call Server"
                          >
                              <Bell className="h-5 w-5" />
                          </Button>
                          
                          <Button
                              size="icon"
                              className="relative rounded-full h-12 w-12"
                              aria-label="Open cart"
                              onClick={() => setIsCartOpen(true)}
                          >
                              <ShoppingCart className="h-6 w-6" />
                              {cartItemCount > 0 && (
                                  <Badge 
                                      className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
                                  >
                                      {cartItemCount}
                                  </Badge>
                              )}
                          </Button>
                      </div>
                  </div>
              </div>
          </header>

          {/* Main Content Area */}
          <main className="container mx-auto px-4 py-6">
              
              {/* --- FIX (Request 1): Order tracker is now rendered ABOVE the menu --- */}
              <div className="mb-8">
                  <OrderTrackerView />
              </div>

              {/* --- MENU CONTENT (Now always visible) --- */}
              <div className="space-y-8">
                  {Object.keys(groupedItems).length === 0 && !loading ? (
                      <Card className="shadow-lg">
                          <CardContent className="py-12 text-center text-muted-foreground">
                              <Coffee className="w-10 h-10 mx-auto mb-4" />
                              <p className="text-lg">Menu is empty</p>
                              <p>Please check back later!</p>
                          </CardContent>
                      </Card>
                  ) : (
                      Object.entries(groupedItems).map(([category, items]) => (
                          <section key={category}>
                              <h2 className="text-2xl font-bold text-foreground mb-4 capitalize">
                                  {category}
                              </h2>
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                  {items.map((item) => {
                                      // --- FIX (Request 2): Check if a simple version is in cart ---
                                      const simpleCartItem = (item.modifiers && item.modifiers.length > 0) ? null : simpleCartItemMap[item.id];

                                      return (
                                          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                              
                                              {/* --- START OF NEW LAYOUT --- */}
                                              {item.imageUrl && (
                                                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                                                      <img 
                                                          src={item.imageUrl} 
                                                          alt={item.name} 
                                                          className="w-full h-full object-cover" 
                                                      />
                                                  </div>
                                              )}
                                              <CardHeader>
                                                  <div className="flex items-center justify-between">
                                                      <CardTitle className="text-lg">{item.name}</CardTitle>
                                                      <span className="text-lg font-bold text-primary">
                                                          ${item.price.toFixed(2)}
                                                      </span>
                                                  </div>
                                              </CardHeader>
                                              <CardContent className="space-y-3 flex-1 flex flex-col justify-end">
                                                  <p className="text-sm text-muted-foreground mb-auto">
                                                      {item.description}
                                                  </p>
                                                  
                                                  {/* --- Button/Counter now at the bottom --- */}
                                                  <div className="pt-2">
                                                      {simpleCartItem ? (
                                                          // Show counter if simple item is in cart
                                                          <div className="flex items-center gap-2 justify-end">
                                                              <Button
                                                                  variant="outline"
                                                                  size="sm"
                                                                  onClick={() => updateQuantity(simpleCartItem.uniqueId, -1)}
                                                              >
                                                                  <Minus className="h-4 w-4" />
                                                              </Button>
                                                              <span className="w-8 text-center font-medium">
                                                                  {simpleCartItem.quantity}
                                                              </span>
                                                              <Button
                                                                  variant="outline"
                                                                  size="sm"
                                                                  onClick={() => updateQuantity(simpleCartItem.uniqueId, 1)}
                                                              >
                                                                  <Plus className="h-4 w-4" />
                                                              </Button>
                                                          </div>
                                                      ) : (
                                                          // Show "Add" or "Customize" button
                                                          <Button
                                                              onClick={() => handleAddItemClick(item)}
                                                              size="sm"
                                                              className="w-full"
                                                          >
                                                              <Plus className="h-4 w-4 mr-1" />
                                                              {item.modifiers && item.modifiers.length > 0 ? 'Customize' : 'Add'}
                                                          </Button>
                                                      )}
                                                  </div>
                                                  {/* --- End of Fix --- */}
                                              </CardContent>
                                              {/* --- END OF NEW LAYOUT --- */}
                                              
                                          </Card>
                                      );
                                  })}
                              </div>
                          </section>
                      ))
                  )}
              </div>
          </main>
      </div>
  );
};

export default CustomerApp;