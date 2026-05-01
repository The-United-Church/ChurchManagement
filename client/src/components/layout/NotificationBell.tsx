import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, MessageCircle, UserPlus, Calendar, Shield, Megaphone, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  markNotificationRead,
  markNotificationsRead,
  notificationDate,
  subscribeNotifications,
  type AppNotification,
} from '@/lib/notifications';

const ICON_MAP: Record<AppNotification['type'], React.ComponentType<{ className?: string }>> = {
  message: MessageCircle,
  member: UserPlus,
  event: Calendar,
  security: Shield,
  announcement: Megaphone,
  registration: CircleCheck,
  system: Bell,
};

/**
 * Top-bar notification bell.
 *
 * Surfaces user notification documents from Firestore's `notifications` collection.
 */
const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    return subscribeNotifications(user.id, setItems, 30);
  }, [user?.id]);

  const unread = items.filter((i) => !i.read);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    const unreadIds = unread.map((i) => i.id);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    try {
      await markNotificationsRead(unreadIds);
    } catch {
      setItems((current) => current.map((item) => (
        unreadIds.includes(item.id) ? { ...item, read: false } : item
      )));
    }
  };

  const markRead = async (id: string) => {
    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, read: true } : item
    )));
    try {
      await markNotificationRead(id);
    } catch {
      setItems((current) => current.map((item) => (
        item.id === id ? { ...item, read: false } : item
      )));
    }
  };

  const handleClick = (item: AppNotification) => {
    if (!item.read) markRead(item.id);
    if (item.link) navigate(item.link);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unread.length > 0 && (
          <Badge className="absolute -right-1 -top-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[10px] text-white pointer-events-none">
            {unread.length > 9 ? '9+' : unread.length}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unread.length > 0 && (
                <span className="text-xs text-gray-500">({unread.length} new)</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={markAllRead}
                >
                  <Check className="h-3 w-3 mr-1" /> Mark all read
                </Button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            )}

            {items.map((n) => {
              const Icon = ICON_MAP[n.type] || Bell;
              const createdAt = notificationDate(n.createdAt);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${
                    n.read ? 'opacity-70' : 'bg-blue-50/30'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      n.type === 'message' ? 'bg-green-100 text-green-600'
                        : n.type === 'member' ? 'bg-blue-100 text-blue-600'
                        : n.type === 'event' ? 'bg-purple-100 text-purple-600'
                        : n.type === 'security' ? 'bg-orange-100 text-orange-600'
                        : n.type === 'announcement' ? 'bg-emerald-100 text-emerald-600'
                        : n.type === 'registration' ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{n.message}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : ''}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="text-xs text-blue-600 hover:underline"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
