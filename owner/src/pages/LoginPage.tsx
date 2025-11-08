import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Coffee, LogIn, LayoutDashboard, Menu, BellRing, Package, 
  BarChart3, TrendingUp, CreditCard, Archive 
} from 'lucide-react';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_EMAIL = 'admin@pixelbay.com'; // Must be created in Firebase Auth

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    if (!username || !password) {
        toast.error('Please enter both username and password.');
        setIsLoggingIn(false);
        return;
    }

    try {
      // --- 1. Attempt Admin Login ---
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
        navigate('/'); // Redirect to Index, which recognizes the Admin
        toast.success('Admin login successful! Redirecting...');
        return;
      }
      
      // --- 2. Attempt Owner Login ---
      const cafesPath = "cafes";
      const q = query(collection(db, cafesPath), where('ownerUsername', '==', username));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error('Invalid credentials. User not found.');
        setIsLoggingIn(false); // Make sure to stop loading
        return;
      }
      
      const cafeDoc = snapshot.docs[0];
      const cafeData = cafeDoc.data();
      
      // Check password match from the Firestore document
      if (cafeData.ownerPassword !== password) {
          toast.error('Invalid password.');
          setIsLoggingIn(false); // Make sure to stop loading
          return;
      }

      // --- 3. Sign in the Owner via Firebase Auth ---
      const ownerEmail = `${username}@owner.pixelbay.com`;
      
      const userCredential = await signInWithEmailAndPassword(auth, ownerEmail, password);
      const ownerUid = userCredential.user.uid;

      // Update the Cafe document to link the Firebase UID if needed
      if (cafeData.ownerUserId === 'pending' || cafeData.ownerUserId !== ownerUid) {
        await updateDoc(doc(db, cafesPath, cafeDoc.id), {
          ownerUserId: ownerUid
        });
      }

      navigate('/'); // Redirect to Index, which recognizes the Owner
      toast.success(`Welcome, ${cafeData.name} Owner! Redirecting...`);

    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please ensure the user is set up in Firebase Auth.';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid username or password.';
      }
      toast.error(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    // --- LAYOUT FIX: This wrapper ensures min-height and footer sticks to bottom ---
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      
      {/* --- Header (No flex-grow) --- */}
      <header className="sticky top-0 z-50 bg-card shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Coffee className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">BayOrder</h1>
              <p className="text-sm text-muted-foreground">
                From Pixelbay Studios
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content (Takes up all remaining space) --- */}
      <main className="flex-grow">
        
        {/* --- Main Hero Section --- */}
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Column 1: Promotional Title */}
            <div className="space-y-6 animate-fade-in-up">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
                Stop Juggling Paper.
                <br />
                Start Growing Your Business.
              </h1>
              <p className="text-xl text-muted-foreground">
                BayOrder is the all-in-one QR ordering platform that gives you
                a live dashboard, a dynamic menu, and full control over your
                kitchen workflow.
              </p>
            </div>
            
            {/* Column 2: Login Card */}
            <div className="animate-fade-in-up animation-delay-200">
              <Card className="shadow-elegant w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
                <CardHeader className="text-center">
                  <Coffee className="h-10 w-10 text-primary mx-auto mb-2" />
                  <CardTitle className="text-2xl">Owner Dashboard</CardTitle>
                  <p className="text-sm text-muted-foreground">Sign in to manage your cafe</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin or cafe_name"
                        required
                        autoComplete="username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoggingIn}>
                      <LogIn className="h-4 w-4 mr-2" />
                      {isLoggingIn ? 'Logging In...' : 'Login'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* --- Detailed "Existing Features" Section --- */}
        <section className="py-16 lg:py-24 bg-card border-y">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in-up">
              <h2 className="text-3xl font-bold">Your Complete Toolkit</h2>
              <p className="text-lg text-muted-foreground mt-4">
                BayOrder isn't just a menu. It's a complete command center
                for your restaurant, designed to reduce errors and increase speed.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Card 1 */}
              <Card className="bg-background shadow-lg animate-fade-in-up animation-delay-100">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Live Order Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    See new orders pop up in real-time. Our dashboard shows every item,
                    customization, and note, organized and ready for your kitchen.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature Card 2 */}
              <Card className="bg-background shadow-lg animate-fade-in-up animation-delay-200">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Menu className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Dynamic Menu & Modifiers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Add photos, descriptions, and powerful 'Modifiers' (e.g., Size,
                    Extras) to upsell items. Toggle availability with one click.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature Card 3 */}
              <Card className="bg-background shadow-lg animate-fade-in-up animation-delay-300">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <BellRing className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Instant "Call Server" Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get a clean, dismissible notification in your header the moment a
                    table requests assistance. No more missed hand-waves.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature Card 4 */}
              <Card className="bg-background shadow-lg animate-fade-in-up animation-delay-100">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Full Kitchen Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Manage the entire process. Update an order's status from 'Pending'
                    to 'Preparing' to 'Ready for Delivery', keeping the customer informed.
                  </p>
                </CardContent>
              </Card>

              {/* Feature Card 5 */}
              <Card className="bg-background shadow-lg animate-fade-in-up animation-delay-200">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Live Table Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    See your entire floor at a glance. Tables automatically turn
                    'Occupied' on an order and 'Vacant' when you mark it as paid.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature Card 6 */}
              <Card className="bg-background shadow-lg animate-fade-in-up animation-delay-300">
                <CardHeader>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Coffee className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Central Admin Panel</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    For owners with multiple locations, our admin panel generates
                    credentials and printable QR codes for each new cafe you add.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* --- "Future Features" Section --- */}
        <section className="py-20 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in-up">
              <h2 className="text-3xl font-bold">Always Evolving</h2>
              <p className="text-lg text-muted-foreground mt-4">
                We're constantly improving BayOrder. Here's a preview of what's
                on our roadmap, coming soon to your dashboard.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-dashed animate-fade-in-up animation-delay-100">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <CardTitle>Analytics Dashboard</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Unlock powerful insights. See your total revenue, most popular
                    items, and busiest hours to make smarter business decisions.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-dashed animate-fade-in-up animation-delay-200">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-primary" />
                    <CardTitle>Integrated Digital Payments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Allow customers to pay directly from their phone via Stripe,
                    Apple Pay, or Google Pay, simplifying checkout for everyone.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-dashed animate-fade-in-up animation-delay-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Archive className="h-6 w-6 text-primary" />
                    <CardTitle>Inventory Tracking</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Manage stock levels directly from your dashboard. Items will
                    automatically become 'Unavailable' when you run out.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* --- Final CTA --- */}
        <section className="pb-20 lg:pb-24">
          <div className="container mx-auto px-4">
            <Card className="bg-primary/5 border-primary shadow-xl animate-fade-in-up">
                <CardContent className="p-10 text-center">
                  <h3 className="text-3xl font-bold mb-4">
                    Ready to Upgrade Your Restaurant?
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                    BayOrder is currently available to partners of Pixelbay Studios.
                    Contact us to get your cafe set up and start simplifying
                    your service today.
                  </p>
                  <Button size="lg" className="text-lg px-10 py-6" asChild>
                    <a href="mailto:sales@pixelbay.com">
                      Contact Sales
                    </a>
                  </Button>
                </CardContent>
              </Card>
          </div>
        </section>

      </main>

      {/* --- Footer (No flex-grow) --- */}
      <footer className="bg-card border-t py-8 flex-shrink-0">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Pixelbay Studios - All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;