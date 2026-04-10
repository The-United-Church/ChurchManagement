import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import MemberSidebar from './MemberSidebar';
import MobileMemberSidebar from './MobileMemberSidebar';
import MemberHome from '../member/MemberHome';
import MemberProfile from '../member/MemberProfile';
import MemberDirectory from '../member/MemberDirectory';
import MemberRegistrations from '../member/MemberRegistrations';
import MemberCalendar from '../member/MemberCalendar';
import MemberNotifications from '../member/MemberNotifications';
import MemberSettings from '../member/MemberSettings';

interface MemberLayoutProps {
  children?: React.ReactNode;
}

/** Map the current pathname to a section key used by renderContent */
function sectionFromPath(pathname: string): string {
  if (pathname === '/member')                         return 'home';
  if (pathname.startsWith('/member/profile'))         return 'my-profile';
  if (pathname.startsWith('/member/directory'))       return 'directory';
  if (pathname.startsWith('/member/registrations'))   return 'my-registrations';
  if (pathname.startsWith('/member/calendar'))        return 'calendar';
  if (pathname.startsWith('/member/notifications'))   return 'notifications';
  if (pathname.startsWith('/member/settings/password'))   return 'change-password';
  if (pathname.startsWith('/member/settings/currency'))   return 'change-currency';
  if (pathname.startsWith('/member/settings/directory'))  return 'directory-settings';
  if (pathname.startsWith('/member/settings'))        return 'general-settings';
  // Fall back to home for legacy paths like /dashboard
  return 'home';
}

const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentChurch } = useChurch();
  const { pathname } = useLocation();

  const activeSection = sectionFromPath(pathname);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':               return <MemberHome />;
      case 'my-profile':         return <MemberProfile />;
      case 'directory':          return <MemberDirectory />;
      case 'my-registrations':   return <MemberRegistrations />;
      case 'calendar':           return <MemberCalendar />;
      case 'notifications':      return <MemberNotifications />;
      case 'general-settings':   return <MemberSettings settingType="general" />;
      case 'change-password':    return <MemberSettings settingType="password" />;
      case 'change-currency':    return <MemberSettings settingType="currency" />;
      case 'directory-settings': return <MemberSettings settingType="directory" />;
      default:                   return <MemberHome />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <MemberSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMemberSidebar />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {currentChurch?.name || 'Church'}
              </h1>
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
