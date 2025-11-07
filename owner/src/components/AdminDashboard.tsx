import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // <-- FIX: Removed getBasePath
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Coffee, PlusCircle, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import QRCodeModal from './QRCodeModal';

interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number;
  ownerUsername: string;
  ownerPassword: string;
  ownerUserId: string;
  tableStatus: Record<string, string>;
}

const AdminDashboard = () => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [newCafe, setNewCafe] = useState({
    name: '',
    address: '',
    tableCount: 5,
  });
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    const cafesPath = "cafes"; // <-- FIX: Root collection
    const q = query(collection(db, cafesPath));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cafesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Cafe));
      setCafes(cafesData);
    });

    return () => unsubscribe();
  }, []);

  const generateCredentials = () => {
    const username = `cafe_${Math.random().toString(36).substring(2, 8)}`;
    const password = Math.random().toString(36).substring(2, 10);
    return { username, password };
  };

  const handleAddCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCafe.name || !newCafe.address) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { username, password } = generateCredentials();
      const tableStatus: Record<string, string> = {};
      
      for (let i = 1; i <= newCafe.tableCount; i++) {
        tableStatus[`T${i}`] = 'Vacant';
      }

      const cafesPath = "cafes"; // <-- FIX: Root collection
      await addDoc(collection(db, cafesPath), {
        name: newCafe.name,
        address: newCafe.address,
        tableCount: newCafe.tableCount,
        ownerUsername: username,
        ownerPassword: password,
        ownerUserId: 'pending', // Will be set when owner first logs in
        tableStatus,
        createdAt: new Date().toISOString(),
      });

      toast.success('Cafe added successfully!');
      setNewCafe({ name: '', address: '', tableCount: 5 });
    } catch (error) {
      console.error('Error adding cafe:', error);
      toast.error('Failed to add cafe');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Coffee className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Add New Cafe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCafe} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Cafe Name</Label>
                <Input
                  id="name"
                  value={newCafe.name}
                  onChange={(e) => setNewCafe({ ...newCafe, name: e.target.value })}
                  placeholder="Enter cafe name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newCafe.address}
                  onChange={(e) => setNewCafe({ ...newCafe, address: e.target.value })}
                  placeholder="Enter address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tableCount">Number of Tables</Label>
                <Input
                  id="tableCount"
                  type="number"
                  min="1"
                  max="20"
                  value={newCafe.tableCount}
                  onChange={(e) => setNewCafe({ ...newCafe, tableCount: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Cafe
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cafes.map((cafe) => (
          <Card key={cafe.id} className="shadow-elegant hover:shadow-elegant-lg transition-smooth">
            <CardHeader>
              <CardTitle className="text-lg">{cafe.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p><span className="font-medium">Address:</span> {cafe.address}</p>
                <p><span className="font-medium">Tables:</span> {cafe.tableCount}</p>
                <p><span className="font-medium">Owner:</span> {cafe.ownerUsername}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedCafe(cafe);
                  setShowQRModal(true);
                }}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Codes
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {showQRModal && selectedCafe && (
        <QRCodeModal
          cafe={selectedCafe}
          onClose={() => {
            setShowQRModal(false);
            setSelectedCafe(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;