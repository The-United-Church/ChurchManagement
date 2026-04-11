import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Church,
  Shield,
  User,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import ChurchSelector from '@/components/church/ChurchSelector';

interface MemberSidebarProps {
  /** Called after any navigation — used by the mobile sheet to close itself */
  onNavigate?: () => void;
}

const menuItems = [
  { id: 'home',             label: 'Home',             icon: Home,     path: '/member' },
  { id: 'directory',        label: 'Directory',        icon: Users,    path: '/member/directory' },
  { id: 'my-registrations', label: 'My Registrations', icon: Calendar, path: '/member/registrations' },
  { id: 'calendar',         label: 'Calendar',         icon: Calendar, path: '/member/calendar' },
  { id: 'notifications',    label: 'Notifications',    icon: Bell,     path: '/member/notifications', badge: '2' },
];

const settingsItems = [
  { id: 'profile', label: 'Profile', icon: User, path: '/member/settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/member/notifications' },
];

const MemberSidebar: React.FC<MemberSidebarProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { effectiveRole } = useChurch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Auto-expand the settings group when a settings route is active
  const settingsActive = settingsItems.some(item => pathname.startsWith(item.path));
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  if (!user) return null;

  const isActive = (path: string) => {
    // Exact match for the base /member route to avoid it matching everything
    if (path === '/member') return pathname === '/member';
    return pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const getRoleIcon = () => {
    switch (effectiveRole) {
      case 'super_admin': return <Church className="h-4 w-4 text-yellow-600" />;
      case 'admin':       return <Shield className="h-4 w-4 text-red-600" />;
      default:            return <Church className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Church Switcher */}
      <ChurchSelector />

      {/* User Info */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {getRoleIcon()}
          <div className="min-w-0">
            <span className="font-medium text-sm text-gray-900 break-words">
              {user.full_name || user.email}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={isActive(item.path) ? 'secondary' : 'ghost'}
              className="w-full justify-start mb-1 h-9"
              onClick={() => handleNavigate(item.path)}
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
              variant={settingsActive ? 'secondary' : 'ghost'}
              className="w-full justify-start h-9"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">Settings</span>
              {settingsOpen
                ? <ChevronDown className="h-3 w-3 ml-auto" />
                : <ChevronRight className="h-3 w-3 ml-auto" />
              }
            </Button>

            {settingsOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {settingsItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={isActive(item.path) ? 'secondary' : 'ghost'}
                    className="w-full justify-start h-8 text-sm"
                    onClick={() => handleNavigate(item.path)}
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

      {/* Logout */}
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
