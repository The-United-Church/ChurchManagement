import React, { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { subscribeTotalUnread } from '@/lib/chat';

interface TopHeaderProps {
  /** Optional left content (e.g. page title) */
  left?: React.ReactNode;
}

/**
 * Desktop top-bar shown on all authenticated pages.
 * Holds the notification bell, messages shortcut, and user avatar.
 */
const TopHeader: React.FC<TopHeaderProps> = ({ left }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  return (
    <header className="hidden md:flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">{left}</div>
      <div className="flex items-center gap-1">
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
          className="ml-2 flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-gray-50"
        >
          <Avatar className="h-8 w-8">
            {user?.profile_img && <AvatarImage src={user.profile_img} alt={user.full_name} />}
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-700 max-w-[140px] truncate">
            {user?.full_name || user?.email}
          </span>
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
