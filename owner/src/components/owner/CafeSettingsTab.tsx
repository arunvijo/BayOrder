import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // <-- FIX: Removed getBasePath
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number;
}

interface CafeSettingsTabProps {
  cafe: Cafe;
}

const CafeSettingsTab = ({ cafe }: CafeSettingsTabProps) => {
  const [formData, setFormData] = useState({
    name: cafe.name,
    address: cafe.address,
    tableCount: cafe.tableCount,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.tableCount < 1 || formData.tableCount > 20) {
      toast.error('Table count must be between 1 and 20');
      return;
    }

    setIsSaving(true);
    try {
      const cafesPath = "cafes"; // <-- FIX: Root collection
      const cafeRef = doc(db, cafesPath, cafe.id);
      
      // If table count changed, update table status
      const updates: any = {
        name: formData.name,
        address: formData.address,
        tableCount: formData.tableCount,
      };

      if (formData.tableCount !== cafe.tableCount) {
        const tableStatus: Record<string, string> = {};
        for (let i = 1; i <= formData.tableCount; i++) {
          tableStatus[`T${i}`] = 'Vacant';
        }
        updates.tableStatus = tableStatus;
      }

      await updateDoc(cafeRef, updates);
      toast.success('Cafe settings updated successfully');
    } catch (error) {
      console.error('Error updating cafe:', error);
      toast.error('Failed to update cafe settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Cafe Settings
      </h2>

      <Card className="shadow-elegant max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Cafe Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cafeName">Cafe Name *</Label>
              <Input
                id="cafeName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="tableCount">Number of Tables (1-20) *</Label>
              <Input
                id="tableCount"
                type="number"
                min="1"
                max="20"
                value={formData.tableCount}
                onChange={(e) => setFormData({ ...formData, tableCount: parseInt(e.target.value) })}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Note: Changing table count will reset all table statuses to Vacant
              </p>
            </div>
            <Button type="submit" disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeSettingsTab;