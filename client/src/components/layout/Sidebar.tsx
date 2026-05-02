import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  Map,
  Monitor,
  User,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import { useNavigate } from 'react-router-dom';
import ChurchSelector from '@/components/church/ChurchSelector';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, collapsed = false, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { effectiveRole, branchRole, currentChurch } = useChurch();
  const navigate = useNavigate();
  const [contributionsOpen, setContributionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const isBranchAdmin = branchRole === 'admin';
  const isBranchCoordinator = branchRole === 'coordinator';

  const canViewAnalytics = effectiveRole === 'super_admin' || effectiveRole === 'admin' || isBranchAdmin;
  const canManageUsers = effectiveRole === 'super_admin' || effectiveRole === 'admin' || isBranchAdmin;
  const canViewChurchMembers = effectiveRole === 'super_admin' || effectiveRole === 'admin' || isBranchAdmin || isBranchCoordinator || branchRole === 'member';
  const isSuperAdmin = effectiveRole === 'super_admin';
  const isDenominationCreator = Boolean(
    user?.id && currentChurch?.admin_id && String(user.id) === String(currentChurch.admin_id)
  );

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
      visible: canViewChurchMembers
    },
    {
      id: 'directory',
      label: 'Directory',
      icon: Users,
      visible: true
    },
    {
      id: 'member-map',
      label: 'Member Map',
      icon: Map,
      visible: canViewAnalytics
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
      visible: canViewAnalytics
    },
    {
      id: 'followups',
      label: 'Follow Ups',
      icon: ClipboardList,
      visible: canViewAnalytics || isBranchCoordinator,
      badge: '15'
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarDays,
      visible: canViewAnalytics
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
      visible: isSuperAdmin || isDenominationCreator
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
      visible: true,
      isDropdown: true
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

  // Helper: wraps a nav button in a tooltip when sidebar is collapsed
  const NavBtn = ({ id, icon: Icon, label, badge, isActive, onClick }: {
    id: string; icon: React.ElementType; label: string; badge?: string;
    isActive: boolean; onClick: () => void;
  }) => {
    const btn = (
      <Button
        key={id}
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full mb-1 h-9 ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
        onClick={onClick}
      >
        <Icon className={`h-4 w-4 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
        {!collapsed && <span className="flex-1 text-left">{label}</span>}
        {!collapsed && badge && (
          <Badge variant="destructive" className="ml-auto text-xs h-5 px-1.5">{badge}</Badge>
        )}
      </Button>
    );
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right">{label}{badge ? ` (${badge})` : ''}</TooltipContent>
        </Tooltip>
      );
    }
    return btn;
  };

  return (
    <TooltipProvider delayDuration={100}>
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header: church selector + collapse toggle */}
      <div className="flex items-center border-b border-gray-200">
        {!collapsed && <div className="flex-1 min-w-0"><ChurchSelector /></div>}
        <button
          onClick={onToggleCollapse}
          className={`shrink-0 flex items-center justify-center h-10 w-10 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors ${collapsed ? 'mx-auto my-2' : 'mr-1'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {getRoleIcon()}
            <span className="font-semibold text-sm text-gray-900">{user.full_name?.split(' ')[0] || user.email}</span>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-gray-200">
          {getRoleIcon()}
        </div>
      )}

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2">
          {menuItems.filter(item => item.visible).map((item) => (
            <NavBtn
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              badge={(item as any).badge}
              isActive={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
            />
          ))}

          {/* Contributions Dropdown */}
          {canViewAnalytics && (
            <div className="mb-1">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isContributionActive ? "secondary" : "ghost"}
                      className="w-full justify-center h-9 px-0 mb-1"
                      onClick={() => setContributionsOpen(!contributionsOpen)}
                    >
                      <DollarSign className="h-4 w-4 shrink-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Contributions</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <Button
                    variant={isContributionActive ? "secondary" : "ghost"}
                    className="w-full justify-start h-9"
                    onClick={() => setContributionsOpen(!contributionsOpen)}
                  >
                    <DollarSign className="h-4 w-4 mr-3" />
                    <span className="flex-1 text-left">Contributions</span>
                    {contributionsOpen ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
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
                </>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 p-2">
        {bottomMenuItems.filter(item => item.visible).map((item) => {
          if ((item as any).isDropdown && item.id === 'settings') {
            const isSettingsActive = activeSection === 'settings' || activeSection === 'notifications';
            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isSettingsActive ? "secondary" : "ghost"}
                      className="w-full justify-center h-9 px-0 mb-1"
                      onClick={() => onSectionChange('settings')}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
              );
            }
            return (
              <div key={item.id} className="mb-1">
                <Button
                  variant={isSettingsActive ? "secondary" : "ghost"}
                  className="w-full justify-start h-9"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {settingsOpen ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
                </Button>
                {settingsOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Button
                      variant={activeSection === 'settings' ? "secondary" : "ghost"}
                      className="w-full justify-start h-8 text-sm"
                      onClick={() => onSectionChange('settings')}
                    >
                      <User className="h-3 w-3 mr-3" />
                      Profile
                    </Button>
                    <Button
                      variant={activeSection === 'notifications' ? "secondary" : "ghost"}
                      className="w-full justify-start h-8 text-sm"
                      onClick={() => onSectionChange('notifications')}
                    >
                      <Bell className="h-3 w-3 mr-3" />
                      Notifications
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavBtn
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeSection === item.id}
              onClick={() => (item as any).isExternalRoute ? navigate(`/${item.id}`) : onSectionChange(item.id)}
            />
          );
        })}

        {/* Logout */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-center h-9 px-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </Button>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
};

export default Sidebar;