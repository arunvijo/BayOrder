import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // <-- FIX: Removed getBasePath
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coffee, LogIn } from 'lucide-react';
import { toast } from 'sonner';

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
      const cafesPath = "cafes"; // <-- FIX: Root collection
      const q = query(collection(db, cafesPath), where('ownerUsername', '==', username));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error('Invalid credentials. User not found.');
        return;
      }
      
      const cafeDoc = snapshot.docs[0];
      const cafeData = cafeDoc.data();
      
      // Check password match from the Firestore document (insecure for demo, but follows structure)
      if (cafeData.ownerPassword !== password) {
          toast.error('Invalid password.');
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
      toast.error(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <Card className="shadow-elegant w-full max-w-sm">
        <CardHeader className="text-center">
          <Coffee className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl">Dashboard Login</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in as Admin or Cafe Owner.</p>
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
  );
};

export default LoginPage;