import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import TopHeader from './TopHeader';
import NotificationBell from './NotificationBell';
import { MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { subscribeTotalUnread } from '@/lib/chat';
import AdminDashboard from '../dashboard/admin/AdminDashboard';
import PeopleManagement from '../dashboard/people/PeopleManagement';
import ChurchManagement from '../dashboard/admin/ChurchManagement';
import BranchManagement from '../dashboard/admin/BranchManagement';
import ChurchMemberManagement from '../dashboard/members/ChurchMemberManagement';
import MemberDirectory from '../member/MemberDirectory';
import MemberLocationMap from '../member/MemberLocationMap';
import MemberSettings from '../member/MemberSettings';
import { EventListPage } from '../event/EventListPage';
import FollowUpsManagement from '../dashboard/followups/FollowUpsManagement';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentChurch, effectiveRole } = useChurch();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    return subscribeTotalUnread(user.id, setUnreadCount);
  }, [user?.id]);

  const initials = (user?.full_name || user?.email || '?')
    .split(/\s+|@/)
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  const activeSection = location.pathname.substring(1) || 'dashboard';

  const handleSectionChange = (section: string) => {
    navigate(`/${section}`);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'people':
        return <PeopleManagement />;
      case 'churches':
        return <ChurchManagement />;
      case 'branches':
        return <BranchManagement />;
      case 'church-members':
        return <ChurchMemberManagement />;
      case 'directory':
        return <MemberDirectory />;
      case 'member-map':
        return <MemberLocationMap />;
      case 'groups':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Groups</h2>
            <p className="text-gray-600">Groups management features will be implemented here.</p>
          </div>
        );
      case 'events':
        return (
          <div className="p-4 md:p-6">
            <EventListPage />
          </div>
        );
      case 'followups':
        return (
          <div className="p-4 md:p-6">
            <FollowUpsManagement />
          </div>
        );
      case 'calendar':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Calendar</h2>
            <p className="text-gray-600">Calendar features will be implemented here.</p>
          </div>
        );
      case 'appointments':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Appointments</h2>
            <p className="text-gray-600">Appointment scheduling features will be implemented here.</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Notifications</h2>
            <p className="text-gray-600">Notification management features will be implemented here.</p>
          </div>
        );
      case 'reports':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Reports</h2>
            <p className="text-gray-600">Reporting features will be implemented here.</p>
          </div>
        );
      case 'accounting':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Accounting</h2>
            <p className="text-gray-600">Accounting features will be implemented here.</p>
          </div>
        );
      case 'add-contribution':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Add Contribution</h2>
            <p className="text-gray-600">Add contribution form will be implemented here.</p>
          </div>
        );
      case 'all-contributions':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">All Contributions</h2>
            <p className="text-gray-600">Contributions list will be implemented here.</p>
          </div>
        );
      case 'batches':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Batches</h2>
            <p className="text-gray-600">Batch management will be implemented here.</p>
          </div>
        );
      case 'funds':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Funds</h2>
            <p className="text-gray-600">Fund management will be implemented here.</p>
          </div>
        );
      case 'pledges':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Pledges</h2>
            <p className="text-gray-600">Pledge management will be implemented here.</p>
          </div>
        );
      case 'contacts':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Contacts</h2>
            <p className="text-gray-600">Contact management will be implemented here.</p>
          </div>
        );
      case 'organisations':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Organisations</h2>
            <p className="text-gray-600">Organisation management will be implemented here.</p>
          </div>
        );
      case 'users-roles':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Users & Roles</h2>
            <p className="text-gray-600">User and role management will be implemented here.</p>
          </div>
        );
      case 'settings':
        return <MemberSettings />;
      case 'help':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Help & Support</h2>
            <p className="text-gray-600">Help documentation will be implemented here.</p>
          </div>
        );
      case 'share-app':
        return (
          <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Share App</h2>
            <p className="text-gray-600">App sharing features will be implemented here.</p>
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <MobileSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {currentChurch?.denomination_name || 'Church Management'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/messages')}
              className="relative h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Messages"
            >
              <MessageSquare className="h-5 w-5 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="ml-1"
              aria-label="Profile"
            >
              <Avatar className="h-8 w-8">
                {user?.profile_img && <AvatarImage src={user.profile_img} alt={user?.full_name} />}
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
        
        <TopHeader />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;