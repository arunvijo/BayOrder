import { useState } from 'react';
import { db, functions } from '@/lib/firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore'; // Added deleteField
import { httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Added Label
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  PlusCircle,
  Trash2,
  Loader2,
  AlertTriangle,
  Settings, // Added Settings
  Save,     // Added Save
} from 'lucide-react';
import QRCodeModal from '../QRCodeModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Interface combining all cafe properties
interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number; // This property might be from the old logic, but tableStatus is primary
  ownerUserId: string;
  tableStatus: Record<string, string>;
}

interface CafeSettingsTabProps {
  cafe: Cafe;
}

const CafeSettingsTab = ({ cafe }: CafeSettingsTabProps) => {
  // --- State for General Settings (from "earlier" code) ---
  const [formData, setFormData] = useState({
    name: cafe.name,
    address: cafe.address,
  });
  const [isSaving, setIsSaving] = useState(false);

  // --- State for Table Management (from "existing" code) ---
  const [newTableName, setNewTableName] = useState('');
  const [tables, setTables] = useState<string[]>(Object.keys(cafe.tableStatus).sort());
  const [isAdding, setIsAdding] = useState(false);

  // --- State for Data Management (from "existing" code) ---
  const [isPurging, setIsPurging] = useState(false);
  const [purgeDays, setPurgeDays] = useState("90");
  const [purgeConfirm, setPurgeConfirm] = useState("");

  // --- Handler for General Settings (from "earlier" code) ---
  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      toast.error('Please fill in Cafe Name and Address');
      return;
    }
    setIsSaving(true);
    try {
      const cafeRef = doc(db, 'cafes', cafe.id);
      await updateDoc(cafeRef, {
        name: formData.name,
        address: formData.address,
      });
      toast.success('Cafe details updated successfully');
    } catch (error) {
      console.error('Error updating cafe details: ', error);
      toast.error('Failed to update cafe details');
    }
    setIsSaving(false);
  };

  // --- Handler for Table Management (from "existing" code) ---
  const handleAddTable = async () => {
    if (!newTableName.trim()) return;
    setIsAdding(true);
    const newKey = newTableName.trim();
    try {
      const cafeRef = doc(db, 'cafes', cafe.id);
      await updateDoc(cafeRef, {
        [`tableStatus.${newKey}`]: 'available'
      });
      setTables(prev => [...prev, newKey].sort());
      setNewTableName('');
      toast.success(`Table "${newKey}" added successfully.`);
    } catch (error) {
      console.error('Error adding table: ', error);
      toast.error('Failed to add table.');
    }
    setIsAdding(false);
  };

  // --- (from "existing" code, with a FIX) ---
  const handleRemoveTable = async (tableName: string) => {
    if (!confirm(`Are you sure you want to delete table "${tableName}"?`)) return;
    try {
      // **FIX:** Actually delete the table from Firestore
      const cafeRef = doc(db, 'cafes', cafe.id);
      await updateDoc(cafeRef, {
        [`tableStatus.${tableName}`]: deleteField()
      });

      // Update local state *after* successful DB operation
      setTables(prev => prev.filter(t => t !== tableName));
      toast.success(`Table "${tableName}" deleted successfully.`);
    } catch (error) {
      console.error('Error removing table: ', error);
      toast.error('Failed to remove table.');
    }
  };

  // --- Handler for Data Management (from "existing" code) ---
  const handlePurgeData = async () => {
    if (purgeConfirm !== 'PURGE') {
      toast.error('Please type "PURGE" to confirm.');
      return;
    }
    setIsPurging(true);
    toast.info('Starting data purge... This may take a few minutes.');

    try {
      const purgeOldData = httpsCallable(functions, 'purgeOldData');
      const result = await purgeOldData({
        cafeId: cafe.id,
        daysToKeep: parseInt(purgeDays, 10)
      });

      const { success, deletedCount } = result.data as { success: boolean, deletedCount: number };
      if (success) {
        toast.success(`Purge successful! Deleted ${deletedCount} old records.`);
      } else {
        toast.error('Purge failed. Check server logs.');
      }
    } catch (error: any) {
      console.error('Error calling purge function: ', error);
      toast.error(`An error occurred: ${error.message}`);
    }

    setIsPurging(false);
    setPurgeConfirm("");
  };

  // --- JSX combining all features ---
  return (
    <div className="space-y-8">
      {/* --- GENERAL SETTINGS CARD (from "earlier" code) --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Cafe Settings
          </CardTitle>
          <CardDescription>Edit your cafe's name and address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGeneralSubmit} className="space-y-4 max-w-lg">
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>


      {/* --- DATA MANAGEMENT (from "existing" code) --- */}
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle />
            Data Management
          </CardTitle>
          <CardDescription>
            Permanently delete old order and request data to reduce costs.
            This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <p>Delete all data older than:</p>
            <Select value={purgeDays} onValueChange={setPurgeDays}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPurging}>
                {isPurging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Purge Old Data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all orders and requests older than
                  {' '}{purgeDays} days. This action cannot be undone.
                  <br /><br />
                  Please type **PURGE** below to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                placeholder='Type "PURGE" to confirm'
                value={purgeConfirm}
                onChange={(e) => setPurgeConfirm(e.target.value)}
                className="border-red-500"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPurgeConfirm("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  asChild
                  disabled={purgeConfirm !== 'PURGE' || isPurging}
                >
                  <Button
                    variant="destructive"
                    onClick={handlePurgeData}
                  >
                    {isPurging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'I understand, delete the data'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeSettingsTab;