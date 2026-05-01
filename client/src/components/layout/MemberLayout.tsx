import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import MemberSidebar from './MemberSidebar';
import MobileMemberSidebar from './MobileMemberSidebar';
import TopHeader from './TopHeader';
import NotificationBell from './NotificationBell';
import { MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { subscribeTotalUnread } from '@/lib/chat';
import MemberHome from '../member/MemberHome';
import MemberDirectory from '../member/MemberDirectory';
import MemberRegistrations from '../member/MemberRegistrations';
import MemberCalendar from '../member/MemberCalendar';
import MemberNotifications from '../member/MemberNotifications';
import MemberSettings from '../member/MemberSettings';
import { EventListPage } from '../event/EventListPage';

interface MemberLayoutProps {
  children?: React.ReactNode;
}

/** Map the current pathname to a section key used by renderContent */
function sectionFromPath(pathname: string): string {
  if (pathname === '/member')                         return 'home';
  if (pathname.startsWith('/member/directory'))       return 'directory';
  if (pathname.startsWith('/member/registrations'))   return 'my-registrations';
  if (pathname.startsWith('/member/calendar'))        return 'calendar';
  if (pathname.startsWith('/member/notifications'))   return 'notifications';
  if (pathname.startsWith('/member/settings'))        return 'settings';
  if (pathname.startsWith('/member/profile'))         return 'settings';
  if (pathname.startsWith('/member/events'))          return 'events';
  return 'home';
}

const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentChurch, currentBranch } = useChurch();
  const { pathname } = useLocation();
  const navigate = useNavigate();
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

  const activeSection = sectionFromPath(pathname);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':               return <MemberHome />;
      case 'directory':          return <MemberDirectory />;
      case 'my-registrations':   return <MemberRegistrations />;
      case 'calendar':           return <MemberCalendar />;
      case 'notifications':      return <MemberNotifications />;
      case 'settings':           return <MemberSettings />;
      case 'events':             return <div className="p-4 md:p-6"><EventListPage /></div>;
      default:                   return <MemberHome />;
    }
  };

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <MemberSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <MobileMemberSidebar />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {currentChurch?.denomination_name || 'Church'}
              </h1>
              {currentBranch && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  {currentBranch.name}
                </p>
              )}
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
              onClick={() => navigate('/member/settings')}
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

export default MemberLayout;
