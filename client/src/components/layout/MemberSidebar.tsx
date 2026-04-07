import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight,
  Home,
  User,
  Users,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Church,
  Shield,
  Key,
  Globe,
  UserCog,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import ChurchSelector from '@/components/church/ChurchSelector';

interface MemberSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const MemberSidebar: React.FC<MemberSidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const { effectiveRole, currentChurch } = useChurch();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!user) return null;

  const getRoleIcon = () => {
    if (user.systemRole === 'super_admin') {
      return <Church className="h-4 w-4 text-yellow-600" />;
    }
    switch (effectiveRole) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      default:
        return <Church className="h-4 w-4 text-blue-600" />;
    }
  };

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      visible: true
    },
    {
      id: 'my-profile',
      label: 'My Profile',
      icon: User,
      visible: true
    },
    {
      id: 'directory',
      label: 'Directory',
      icon: Users,
      visible: true
    },
    {
      id: 'my-registrations',
      label: 'My Registrations',
      icon: Calendar,
      visible: true
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      visible: true
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      visible: true,
      badge: '2'
    }
  ];

  const settingsItems = [
    { id: 'general-settings', label: 'General Settings', icon: Settings },
    { id: 'change-password', label: 'Change Password', icon: Key },
    { id: 'change-currency', label: 'Change Currency', icon: DollarSign },
    { id: 'directory-settings', label: 'Directory Settings', icon: UserCog }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Church Switcher */}
      <ChurchSelector />

      {/* User Info */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {getRoleIcon()}
          <div>
            <span className="font-medium text-sm text-gray-900">{user.firstName} {user.lastName}</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {effectiveRole}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2">
          {menuItems.filter(item => item.visible).map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "secondary" : "ghost"}
              className="w-full justify-start mb-1 h-9"
              onClick={() => onSectionChange(item.id)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant="destructive" className="ml-auto text-xs h-5 px-1.5">
                  {item.badge}
                </Badge>
              )}
            </Button>
          ))}

          {/* Settings Dropdown */}
          <div className="mb-1">
            <Button
              variant={activeSection.startsWith('settings') || settingsItems.some(item => activeSection === item.id) ? "secondary" : "ghost"}
              className="w-full justify-start h-9"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">Settings</span>
              {settingsOpen ? (
                <ChevronDown className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronRight className="h-3 w-3 ml-auto" />
              )}
            </Button>
            
            {settingsOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {settingsItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? "secondary" : "ghost"}
                    className="w-full justify-start h-8 text-sm"
                    onClick={() => onSectionChange(item.id)}
                  >
                    <item.icon className="h-3 w-3 mr-3" />
                    {item.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 p-2">
        <Button
          variant="ghost"
          className="w-full justify-start h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default MemberSidebar;