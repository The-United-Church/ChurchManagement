import React, { useState } from 'react';
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

const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const [activeSection, setActiveSection] = useState('home');
  const { user } = useAuth();
  const { currentChurch, effectiveRole } = useChurch();

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <MemberHome />;
      case 'my-profile':
        return <MemberProfile />;
      case 'directory':
        return <MemberDirectory />;
      case 'my-registrations':
        return <MemberRegistrations />;
      case 'calendar':
        return <MemberCalendar />;
      case 'notifications':
        return <MemberNotifications />;
      case 'general-settings':
        return <MemberSettings settingType="general" />;
      case 'change-password':
        return <MemberSettings settingType="password" />;
      case 'change-currency':
        return <MemberSettings settingType="currency" />;
      case 'directory-settings':
        return <MemberSettings settingType="directory" />;
      default:
        return <MemberHome />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <MemberSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMemberSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {currentChurch?.name || 'Church'}
              </h1>
              {user && (
                <p className="text-sm text-gray-600">
                  {user.firstName} ({user.role})
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