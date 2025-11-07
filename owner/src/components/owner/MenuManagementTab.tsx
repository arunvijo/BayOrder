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
import { db, auth } from '@/lib/firebase'; // <-- FIX: Removed getBasePath

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { PlusCircle, Edit, Trash2, Coffee } from 'lucide-react';
import { toast } from 'sonner';

interface MenuItemBase {
  cafeId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
}

interface MenuItem extends MenuItemBase {
  id: string;
}

interface MenuManagementTabProps {
  cafeId: string;
}

const categories = ['Beverages', 'Food', 'Desserts', 'Snacks'] as const;

// Fix: Use DocumentData type for Firestore compatibility
type MenuItemData = MenuItemBase & DocumentData;

const MenuManagementTab = ({ cafeId }: MenuManagementTabProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Beverages',
    imageUrl: '',
    available: true,
  });

  // Fix: Simplify path handling - use direct collection reference
  const menuItemsColRef = useMemo(() => {
    try {
      // Option 1: Use direct collection reference (recommended)
      return collection(db, 'menuItems') as CollectionReference<MenuItemData>;
      
      // Option 2: If you need custom path, ensure odd number of segments
      // const basePath = 'artifacts/default-app/public/data'; // Ensure this has odd segments
      // return collection(db, basePath, 'menuItems') as CollectionReference<MenuItemData>;
    } catch (error) {
      console.error('Error creating collection reference:', error);
      // Fallback to direct collection reference
      return collection(db, 'menuItems') as CollectionReference<MenuItemData>;
    }
  }, []);

  // Set Firestore log level once and log auth state
  useEffect(() => {
    try {
      setLogLevel('debug');
    } catch {
      // ignore if SDK build doesn't expose setLogLevel
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
          } as MenuItem;
        });
        setMenuItems(items);
        console.log('Loaded menu items:', items.length);
      },
      (err: FirestoreError) => {
        console.error('onSnapshot error:', err);
        if (err.code === 'permission-denied') {
          toast.error('Permission denied. Please check:\n1. You are logged in\n2. Firestore rules allow access\n3. Your cafe ID matches the document permissions');
        } else {
          toast.error('Failed to load menu items: ' + err.message);
        }
      }
    );
    return () => unsubscribe();
  }, [menuItemsColRef, cafeId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Beverages',
      imageUrl: '',
      available: true,
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }

    const priceNum = Number(formData.price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error('Price must be a valid positive number');
      return;
    }

    try {
      const itemData: MenuItemData = {
        cafeId: editingItem ? editingItem.cafeId : cafeId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        category: formData.category,
        available: formData.available,
      };

      // Only add imageUrl if it's not empty
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
      const err = error as FirestoreError;
      if (err.code === 'permission-denied') {
        toast.error('Permission denied. Check Firestore rules and user auth.');
      } else {
        toast.error('Failed to save menu item: ' + err.message);
      }
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description ?? '',
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      available: item.available,
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
      const err = error as FirestoreError;
      if (err.code === 'permission-denied') {
        toast.error('Permission denied. Check Firestore rules and user auth.');
      } else {
        toast.error('Failed to delete menu item: ' + err.message);
      }
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

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter item description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex items-center justify-between border p-3 rounded-md">
                <Label htmlFor="available" className="font-medium cursor-pointer">
                  Available for Ordering
                </Label>
                <Switch
                  id="available"
                  checked={formData.available}
                  onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {menuItems.length === 0 ? (
        <Card className="shadow-elegant">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No menu items found</p>
            <p className="text-sm">
              {auth?.currentUser 
                ? 'Add your first menu item to get started!' 
                : 'Please log in to manage menu items.'
              }
            </p>
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
                    className="shadow-elegant hover:shadow-elegant-lg transition-smooth"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center">
                          <span>{item.name}</span>
                          {!item.available && (
                            <Badge variant="destructive" className="ml-2">
                              Unavailable
                            </Badge>
                          )}
                        </CardTitle>
                        <span className="text-primary font-bold">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      <div className="flex gap-2">
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