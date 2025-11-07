// src/pages/Index.tsx (Complete Updated File)
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth, initializeAuth } from '@/lib/firebase'; // <-- FIX: Removed getBasePath
import { Loader2, Coffee, LogOut } from 'lucide-react'; // ⬅️ IMPORT LogOut
import AdminDashboard from '@/components/AdminDashboard';
import OwnerDashboard from '@/components/OwnerDashboard';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // ⬅️ IMPORT Button
import { signOut } from 'firebase/auth'; // ⬅️ IMPORT signOut

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // The auth.onAuthStateChanged listener below handles the redirection to /login
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const checkCafeOwnership = (userId: string) => {
      const cafesPath = "cafes"; // <-- FIX: Root collection
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
            // User is authenticated, proceed with role checks
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
            // User is NOT logged in. Redirect directly to the login page.
            setIsAdmin(false);
            setUserCafe(null);
            setLoading(false);
            
            // Redirect only if not already on the login page
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
          <Coffee className="h-16 w-16 text-primary mx-auto animate-pulse" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading BayOrder Dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // If loading is false but no user is found (i.e., successfully redirected to /login), return null.
  if (!auth.currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coffee className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">BayOrder</h1>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? 'Admin Dashboard' : userCafe ? `Owner Dashboard - ${userCafe.name}` : 'Dashboard'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}> {/* ⬅️ LOGOUT BUTTON */}
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAdmin ? (
          <AdminDashboard />
        ) : userCafe ? (
          <OwnerDashboard userCafe={userCafe} />
        ) : (
          <div className="text-center py-12">
            <Coffee className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
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