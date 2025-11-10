// src/pages/Index.tsx (Complete Updated File)
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth, initializeAuth } from '@/lib/firebase';
import { Loader2, Store, LogOut, BellRing, Bell } from 'lucide-react'; // <-- Import Bell icons
import AdminDashboard from '@/components/AdminDashboard';
import OwnerDashboard, { type Alert } from '@/components/OwnerDashboard'; // <-- Import Alert type
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // <-- Import Badge
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // <-- Import Sheet
import { Card, CardContent, CardTitle } from '@/components/ui/card'; // <-- Import Card
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number;
  ownerUserId: string;
  tableStatus: Record<string, string>;
}

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userCafe, setUserCafe] = useState<Cafe | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- New state for alerts ---
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAlertSheetOpen, setIsAlertSheetOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // --- New handler to dismiss alerts ---
  const handleMarkAlertAsDone = async (alertId: string) => {
    try {
      const alertRef = doc(db, "requests", alertId);
      await updateDoc(alertRef, {
        status: 'done'
      });
      toast.info("Alert marked as done.");
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    }
  };

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const checkCafeOwnership = (userId: string) => {
      const cafesPath = "cafes";
      const q = query(collection(db, cafesPath));

      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const ownedCafe = snapshot.docs.find(
          doc => doc.data().ownerUserId === userId
        );

        if (ownedCafe) {
          setUserCafe({
            id: ownedCafe.id,
            ...ownedCafe.data()
          } as Cafe);
        } else {
          setUserCafe(null);
        }
        setLoading(false);
      });
    };

    const initialize = async () => {
      try {
        await initializeAuth();
        
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
          if (user) {
            const storedAdminId = localStorage.getItem('pixelbay_admin_id');
            
            if (!storedAdminId) {
              localStorage.setItem('pixelbay_admin_id', user.uid);
              setAdminUserId(user.uid);
              setIsAdmin(true);
              setLoading(false);
            } else if (storedAdminId === user.uid) {
              setAdminUserId(storedAdminId);
              setIsAdmin(true);
              setLoading(false);
            } else {
              setAdminUserId(storedAdminId);
              checkCafeOwnership(user.uid);
            }
          } else {
            setIsAdmin(false);
            setUserCafe(null);
            setLoading(false);
            
            if (window.location.pathname !== '/login') {
              navigate('/login'); 
            }
          }
        });

        return () => {
          unsubscribeAuth();
          if (unsubscribeFirestore) {
            unsubscribeFirestore();
          }
        };

      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
      }
    };

    initialize();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <Store className="h-16 w-16 text-primary mx-auto animate-pulse" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading BayOrder Dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      
      {/* --- New Alert Sheet --- */}
      <Sheet open={isAlertSheetOpen} onOpenChange={setIsAlertSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-2xl flex items-center gap-2">
              <BellRing className="h-6 w-6" /> Live Alerts
            </SheetTitle>
          </SheetHeader>
          
          {alerts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">No new alerts.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              {alerts.map((alert) => (
                <Card key={alert.id} className="shadow-lg border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-destructive">
                        Table {alert.tableId}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Needs server assistance!
                      </p>
                    </div>
                    <Button 
                      variant="destructive"
                      onClick={() => handleMarkAlertAsDone(alert.id)}
                    >
                      Mark as Done
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">BayOrder</h1>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? 'Admin Dashboard' : userCafe ? `Owner Dashboard - ${userCafe.name}` : 'Dashboard'}
                </p>
              </div>
            </div>
            
            {/* --- Updated Header Buttons --- */}
            <div className="flex items-center gap-2">
              {!isAdmin && userCafe && (
                <Button
                  variant="outline"
                  size="icon"
                  className="relative text-destructive border-destructive/50 hover:bg-destructive/10"
                  aria-label="Open alerts"
                  onClick={() => setIsAlertSheetOpen(true)}
                >
                  <Bell className="h-5 w-5" />
                  {alerts.length > 0 && (
                    <Badge 
                        className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
                    >
                        {alerts.length}
                    </Badge>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAdmin ? (
          <AdminDashboard />
        ) : userCafe ? (
          // --- Pass the alert setter to the dashboard ---
          <OwnerDashboard userCafe={userCafe} onAlertsChange={setAlerts} />
        ) : (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Cafe Access</h2>
            <p className="text-muted-foreground">
              Your user account is logged in but not associated with a cafe. Please contact the administrator.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;