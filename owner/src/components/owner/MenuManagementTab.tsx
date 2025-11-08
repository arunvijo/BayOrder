import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setLogLevel,
  type FirestoreError,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Edit, Trash2, Coffee, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

// --- Types (from CustomerApp) ---
interface ModifierOption {
  label: string;
  price?: number;
}

interface Modifiers {
  type: 'radio' | 'checkbox';
  name: string;
  options: ModifierOption[];
}

interface MenuItemBase {
  cafeId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
  modifiers?: Modifiers[]; // <-- ADDED
}

interface MenuItem extends MenuItemBase {
  id: string;
}

interface MenuManagementTabProps {
  cafeId: string;
}

const categories = ['Beverages', 'Food', 'Desserts', 'Snacks'] as const;

type MenuItemData = MenuItemBase & DocumentData;

// --- Initial States for new forms ---
const newModifierGroup = (): Modifiers => ({
  name: '',
  type: 'radio',
  options: [{ label: '', price: 0 }]
});

const newModifierOption = (): ModifierOption => ({
  label: '',
  price: 0
});

const MenuManagementTab = ({ cafeId }: MenuManagementTabProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // --- Updated formData state ---
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Beverages',
    imageUrl: '',
    available: true,
    modifiers: [] as Modifiers[], // <-- ADDED
  });

  const menuItemsColRef = useMemo(() => {
    return collection(db, 'menuItems') as CollectionReference<MenuItemData>;
  }, []);

  useEffect(() => {
    try {
      setLogLevel('debug');
    } catch {
      // ignore
    }
    const user = auth?.currentUser;
    console.log(user ? `Current user UID: ${user.uid}` : 'No user logged in.');
  }, []);

  // Load menu items
  useEffect(() => {
    const q = query(menuItemsColRef, where('cafeId', '==', cafeId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            available: data.available ?? true,
            modifiers: data.modifiers || [], // <-- Ensure modifiers array exists
          } as MenuItem;
        });
        setMenuItems(items);
        console.log('Loaded menu items:', items.length);
      },
      (err: FirestoreError) => {
        console.error('onSnapshot error:', err);
        toast.error('Failed to load menu items: ' + err.message);
      }
    );
    return () => unsubscribe();
  }, [menuItemsColRef, cafeId]);

  // --- Updated resetForm ---
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Beverages',
      imageUrl: '',
      available: true,
      modifiers: [], // <-- ADDED
    });
    setEditingItem(null);
  };

  // --- Handlers for nested Modifier state ---
  
  const addModifier = () => {
    setFormData(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, newModifierGroup()]
    }));
  };

  const removeModifier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index)
    }));
  };

  const handleModifierChange = (index: number, field: 'name' | 'type', value: string) => {
    const newModifiers = [...formData.modifiers];
    newModifiers[index] = { ...newModifiers[index], [field]: value };
    setFormData(prev => ({ ...prev, modifiers: newModifiers }));
  };

  const addOption = (modIndex: number) => {
    const newModifiers = [...formData.modifiers];
    newModifiers[modIndex].options.push(newModifierOption());
    setFormData(prev => ({ ...prev, modifiers: newModifiers }));
  };

  const removeOption = (modIndex: number, optIndex: number) => {
    const newModifiers = [...formData.modifiers];
    newModifiers[modIndex].options = newModifiers[modIndex].options.filter((_, i) => i !== optIndex);
    setFormData(prev => ({ ...prev, modifiers: newModifiers }));
  };

  const handleOptionChange = (modIndex: number, optIndex: number, field: 'label' | 'price', value: string | number) => {
    const newModifiers = [...formData.modifiers];
    const newOptions = [...newModifiers[modIndex].options];
    newOptions[optIndex] = { ...newOptions[optIndex], [field]: value };
    newModifiers[modIndex].options = newOptions;
    setFormData(prev => ({ ...prev, modifiers: newModifiers }));
  };
  
  // --- Updated handleSubmit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }
    // ... (price validation)

    try {
      const itemData: MenuItemData = {
        cafeId: editingItem ? editingItem.cafeId : cafeId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        category: formData.category,
        available: formData.available,
        modifiers: formData.modifiers, // <-- ADDED
      };

      if (formData.imageUrl.trim()) {
        itemData.imageUrl = formData.imageUrl.trim();
      }

      console.log('Saving menu item:', itemData);

      if (editingItem) {
        const itemDocRef = doc(menuItemsColRef, editingItem.id);
        await updateDoc(itemDocRef, itemData);
        toast.success('Menu item updated successfully');
      } else {
        await addDoc(menuItemsColRef, itemData);
        toast.success('Menu item added successfully');
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save menu item');
    }
  };

  // --- Updated handleEdit ---
  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description ?? '',
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      available: item.available,
      modifiers: item.modifiers || [], // <-- ADDED
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      const itemDocRef = doc(menuItemsColRef, itemId);
      await deleteDoc(itemDocRef);
      toast.success('Menu item deleted successfully');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const groupedItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      (acc[item.category] ||= []).push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Coffee className="h-6 w-6" />
          Menu Management
        </h2>

        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>

          {/* --- UPDATED DIALOG CONTENT --- */}
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="pr-4 -mr-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Basic Info --- */}
                <div>
                  <Label htmlFor="name">Item Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price ($) *</Label>
                    <Input id="price" type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input id="imageUrl" type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                </div>
                <div className="flex items-center justify-between border p-3 rounded-md">
                  <Label htmlFor="available" className="font-medium cursor-pointer">Available for Ordering</Label>
                  <Switch id="available" checked={formData.available} onCheckedChange={(checked) => setFormData({ ...formData, available: checked })} />
                </div>
                
                <Separator />

                {/* --- New Modifiers/Customizations Section --- */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Customizations</h3>
                  {formData.modifiers.map((modifier, modIndex) => (
                    <div key={modIndex} className="border p-3 rounded-md space-y-3 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Group {modIndex + 1}</h4>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeModifier(modIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Group Name</Label>
                          <Input value={modifier.name} onChange={(e) => handleModifierChange(modIndex, 'name', e.target.value)} placeholder="e.g., Size" />
                        </div>
                        <div>
                          <Label>Selection Type</Label>
                          <Select value={modifier.type} onValueChange={(value: 'radio' | 'checkbox') => handleModifierChange(modIndex, 'type', value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="radio">One Choice (Radio)</SelectItem>
                              <SelectItem value="checkbox">Multiple Choice (Checkbox)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* --- Options Sub-form --- */}
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {modifier.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              value={option.label}
                              onChange={(e) => handleOptionChange(modIndex, optIndex, 'label', e.target.value)}
                              placeholder="Option Name (e.g., Large)"
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={option.price || 0}
                              onChange={(e) => handleOptionChange(modIndex, optIndex, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="Price (e.g., 0.50)"
                              className="w-24"
                            />
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeOption(modIndex, optIndex)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="secondary" size="sm" onClick={() => addOption(modIndex)}>
                          <Plus className="h-4 w-4 mr-1" /> Add Option
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={addModifier}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Customization Group
                  </Button>
                </div>

                <Button type="submit" className="w-full">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {menuItems.length === 0 ? (
        <Card className="shadow-elegant">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No menu items found</p>
            <p className="text-sm">Add your first menu item to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xl font-semibold mb-3">{category}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="shadow-elegant hover:shadow-elegant-lg transition-smooth flex flex-col"
                  >
                    {/* --- FIX: ADDED IMAGE --- */}
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
                        <span className="text-primary font-bold">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      {/* --- ADDED BADGES --- */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {!item.available && (
                          <Badge variant="destructive">Unavailable</Badge>
                        )}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <Badge variant="secondary">Customizable</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 flex flex-col justify-end">
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-auto">{item.description}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuManagementTab;