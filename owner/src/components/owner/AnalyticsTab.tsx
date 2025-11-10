import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
// FIX: Switched to a relative path to resolve the build error
import { db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the types for your data
interface Order {
  id: string;
  status: string; // Changed to string to accept "Paid"
  total: number;  // FIX: Changed from totalPrice to total
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  name: string; // We will use this name directly
  quantity: number;
}

interface PopularItem {
  name: string;
  count: number;
}

interface AnalyticsTabProps {
  cafeId: string;
}

const AnalyticsTab = ({ cafeId }: AnalyticsTabProps) => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cafeId) return;

    setIsLoading(true);
    setError(null);

    // 1. Get all completed orders in real-time
    const ordersQuery = query(
      collection(db, 'orders'),
      where('cafeId', '==', cafeId),
      where('status', '==', 'Paid') // FIX: Changed 'completed' to 'Paid'
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

      // 2. Process analytics data
      let revenue = 0;
      const itemCounts = new Map<string, number>();

      orders.forEach(order => {
        // FIX: Use order.total instead of order.totalPrice
        revenue += order.total; 
        
        order.items.forEach(item => {
          // Use item.name as the key
          const currentCount = itemCounts.get(item.name) || 0;
          itemCounts.set(item.name, currentCount + item.quantity);
        });
      });

      // 3. Format data for the chart
      const popularItemsData: PopularItem[] = Array.from(itemCounts.entries())
        .map(([name, count]) => ({
          name: name,
          count: count,
        }))
        .sort((a, b) => b.count - a.count) // Sort descending
        .slice(0, 5); // Get top 5

      setTotalRevenue(revenue);
      setTotalOrders(orders.length);
      setPopularItems(popularItemsData);
      setIsLoading(false);

    }, (err) => {
      console.error(err);
      setError('Failed to load analytics data.');
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount

  }, [cafeId]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-3/4" />
            ) : (
              <div className="text-4xl font-bold">
                ${totalRevenue.toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Completed Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-1/4" />
            ) : (
              <div className="text-4xl font-bold">{totalOrders}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Most Popular Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : popularItems.length === 0 ? (
            <p className="text-muted-foreground">No completed orders found yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={popularItems}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Items Sold" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsTab;