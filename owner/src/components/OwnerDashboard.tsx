import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Menu, Settings } from 'lucide-react';
import LiveOrdersTab from './owner/LiveOrdersTab';
import MenuManagementTab from './owner/MenuManagementTab';
import CafeSettingsTab from './owner/CafeSettingsTab';

interface Cafe {
  id: string;
  name: string;
  address: string;
  tableCount: number;
  ownerUserId: string;
  tableStatus: Record<string, string>;
}

interface OwnerDashboardProps {
  userCafe: Cafe;
}

const OwnerDashboard = ({ userCafe }: OwnerDashboardProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');

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
