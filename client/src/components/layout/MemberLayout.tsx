import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import MemberSidebar from './MemberSidebar';
import MobileMemberSidebar from './MobileMemberSidebar';
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
          <div className="flex items-center gap-3">
            <MobileMemberSidebar />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {currentChurch?.denomination_name || 'Church'}
              </h1>
              {currentBranch && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  {currentBranch.name}
                </p>
              )}
              {user && (
                <p className="text-sm text-gray-600">
                  {user.full_name} ({user.role?.name ?? user.role})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default MemberLayout;
