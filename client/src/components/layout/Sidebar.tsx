import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  Zap
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const [contributionsOpen, setContributionsOpen] = useState(false);
  const [currentMinistry, setCurrentMinistry] = useState('Main Church');

  if (!user) return null;

  const ministries = [
    { name: 'Main Church', users: 312, maxUsers: 500, color: 'bg-blue-500' },
    { name: 'Youth Ministry', users: 85, maxUsers: 150, color: 'bg-green-500' },
    { name: 'Worship Team', users: 24, maxUsers: 50, color: 'bg-purple-500' }
  ];

  const currentMinistryData = ministries.find(m => m.name === currentMinistry) || ministries[0];
  const progressPercentage = (currentMinistryData.users / currentMinistryData.maxUsers) * 100;

  const getRoleIcon = () => {
    switch (user.role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      default:
        return <Church className="h-4 w-4 text-blue-600" />;
    }
  };

  const canViewAnalytics = user.role === 'owner' || user.role === 'admin';
  const canManageUsers = user.role === 'owner' || user.role === 'admin';

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

  const bottomMenuItems = [
    {
      id: 'users-roles',
      label: 'Users & Roles',
      icon: Shield,
      visible: canManageUsers
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
      {/* Ministry Switcher */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          {getRoleIcon()}
          <span className="font-semibold text-sm text-gray-900">{user.firstName}</span>
          <Badge variant="secondary" className="text-xs">
            {user.role}
          </Badge>
        </div>
        
        <Card className="bg-gray-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{currentMinistry}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Users</span>
                <span>{currentMinistryData.users}/{currentMinistryData.maxUsers}</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
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
                variant={activeSection.startsWith('contributions') ? "secondary" : "ghost"}
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
            onClick={() => onSectionChange(item.id)}
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