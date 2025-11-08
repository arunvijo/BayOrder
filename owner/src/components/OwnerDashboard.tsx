import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Menu, Settings } from 'lucide-react';
import LiveOrdersTab from './owner/LiveOrdersTab';
import MenuManagementTab from './owner/MenuManagementTab';
import CafeSettingsTab from './owner/CafeSettingsTab';
import { toast } from 'sonner';

interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number;
  ownerUserId: string;
  tableStatus: Record<string, string>;
}

// New type for Server Alerts
export interface Alert {
  id: string;
  tableId: string;
  createdAt: any;
}

interface OwnerDashboardProps {
  userCafe: Cafe;
  // New prop to send alerts up to the header
  onAlertsChange: (alerts: Alert[]) => void;
}

const OwnerDashboard = ({ userCafe, onAlertsChange }: OwnerDashboardProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- Alert listener is MOVED here ---
  useEffect(() => {
    const q = query(
      collection(db, "requests"),
      where('cafeId', '==', userCafe.id),
      where('status', '==', 'new'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Alert));
      // Pass the alerts up to the Index.tsx header
      onAlertsChange(alertsData);
    });

    return () => unsubscribe();
  }, [userCafe.id, onAlertsChange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{userCafe.name}</h1>
          <p className="text-muted-foreground">{userCafe.address}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">Menu</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {/* We pass the cafeId and tableStatus, but the alert logic is gone from this tab */}
          <LiveOrdersTab cafeId={userCafe.id} tableStatus={userCafe.tableStatus} />
        </TabsContent>

        <TabsContent value="menu" className="mt-6">
          <MenuManagementTab cafeId={userCafe.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <CafeSettingsTab cafe={userCafe} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerDashboard;