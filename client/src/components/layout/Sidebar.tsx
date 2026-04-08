import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight,
  BarChart3,
  Users,
  UserCheck,
  Calendar,
  ClipboardList,
  CalendarDays,
  Clock,
  Bell,
  FileText,
  Calculator,
  DollarSign,
  Plus,
  List,
  Package,
  Wallet,
  HandHeart,
  Contact,
  Building,
  Shield,
  Settings,
  HelpCircle,
  Share2,
  LogOut,
  Church,
  Crown,
  MapPin,
  Monitor,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import { useNavigate } from 'react-router-dom';
import ChurchSelector from '@/components/church/ChurchSelector';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const { effectiveRole } = useChurch();
  const navigate = useNavigate();
  const [contributionsOpen, setContributionsOpen] = useState(false);

  if (!user) return null;

  const getRoleIcon = () => {
    switch (effectiveRole) {
      case 'super_admin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      default:
        return <Church className="h-4 w-4 text-blue-600" />;
    }
  };

  const canViewAnalytics = effectiveRole === 'super_admin' || effectiveRole === 'admin';
  const canManageUsers = effectiveRole === 'super_admin' || effectiveRole === 'admin';
  const isSuperAdmin = effectiveRole === 'super_admin';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      visible: canViewAnalytics
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
      visible: true
    },
    {
      id: 'church-members',
      label: 'Church Members',
      icon: UserCheck,
      visible: canManageUsers
    },
    {
      id: 'groups',
      label: 'Groups',
      icon: UserCheck,
      visible: true
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      visible: true
    },
    {
      id: 'followups',
      label: 'Follow Ups',
      icon: ClipboardList,
      visible: canViewAnalytics,
      badge: '15'
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarDays,
      visible: true
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Clock,
      visible: canViewAnalytics
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      visible: true,
      badge: '3'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      visible: canViewAnalytics
    },
    {
      id: 'accounting',
      label: 'Accounting',
      icon: Calculator,
      visible: canViewAnalytics
    }
  ];

  const contributionItems = [
    { id: 'add-contribution', label: 'Add Contribution', icon: Plus },
    { id: 'all-contributions', label: 'All Contributions', icon: List },
    { id: 'batches', label: 'Batches', icon: Package },
    { id: 'funds', label: 'Funds', icon: Wallet },
    { id: 'pledges', label: 'Pledges', icon: HandHeart },
    { id: 'contacts', label: 'Contacts', icon: Contact },
    { id: 'organisations', label: 'Organisations', icon: Building }
  ];

  const isContributionActive = contributionItems.some(item => item.id === activeSection);

  useEffect(() => {
    if (isContributionActive) {
      setContributionsOpen(true);
    }
  }, [activeSection, isContributionActive]);

  const bottomMenuItems = [
    {
      id: 'churches',
      label: 'Churches',
      icon: Building,
      visible: false
    },
    {
      id: 'branches',
      label: 'Branches',
      icon: MapPin,
      visible: canManageUsers
    },
    {
      id: 'users-roles',
      label: 'Users & Roles',
      icon: Shield,
      visible: canManageUsers
    },
    {
      id: 'superadmin',
      label: 'Developer Console',
      icon: Monitor,
      visible: isSuperAdmin,
      isExternalRoute: true
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      visible: true
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
      visible: true
    },
    {
      id: 'share-app',
      label: 'Share App',
      icon: Share2,
      visible: true
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Church Switcher */}
      <ChurchSelector />

      {/* User Info */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {getRoleIcon()}
          <span className="font-semibold text-sm text-gray-900">{user.full_name?.split(' ')[0] || user.email}</span>
          <Badge variant="secondary" className="text-xs">
            {effectiveRole}
          </Badge>
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

          {/* Contributions Dropdown */}
          {canViewAnalytics && (
            <div className="mb-1">
              <Button
                variant={isContributionActive ? "secondary" : "ghost"}
                className="w-full justify-start h-9"
                onClick={() => setContributionsOpen(!contributionsOpen)}
              >
                <DollarSign className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">Contributions</span>
                {contributionsOpen ? (
                  <ChevronDown className="h-3 w-3 ml-auto" />
                ) : (
                  <ChevronRight className="h-3 w-3 ml-auto" />
                )}
              </Button>
              
              {contributionsOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {contributionItems.map((item) => (
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
          )}
        </nav>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 p-2">
        {bottomMenuItems.filter(item => item.visible).map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "secondary" : "ghost"}
            className="w-full justify-start mb-1 h-9"
            onClick={() => (item as any).isExternalRoute ? navigate(`/${item.id}`) : onSectionChange(item.id)}
          >
            <item.icon className="h-4 w-4 mr-3" />
            {item.label}
          </Button>
        ))}
        
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

export default Sidebar;