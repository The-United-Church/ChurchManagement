import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, MessageCircle, UserPlus, Calendar, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { fetchRecentActivities } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItem {
  id: string;
  type: 'message' | 'member' | 'event' | 'security' | 'activity';
  title: string;
  description: string;
  createdAt: string;
  read?: boolean;
  link?: string;
}

const ICON_MAP: Record<NotificationItem['type'], React.ComponentType<{ className?: string }>> = {
  message: MessageCircle,
  member: UserPlus,
  event: Calendar,
  security: Shield,
  activity: Bell,
};

const STORAGE_KEY = 'cf_notifications_read';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function setReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

/**
 * Top-bar notification bell.
 *
 * Surfaces:
 *  - Recent server activity log entries (member added, role changes, login alerts, etc.)
 *  - New direct-message hints (when messaging is added, items will be pushed here).
 */
const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIdsState] = useState<Set<string>>(getReadIds);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: activitiesRes } = useQuery({
    queryKey: ['notifications', 'recent-activities'],
    queryFn: () => fetchRecentActivities(15),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const items: NotificationItem[] = (activitiesRes?.data || []).map((a: any) => {
    let type: NotificationItem['type'] = 'activity';
    if (a.entity_type === 'user') type = 'member';
    else if (a.entity_type === 'event') type = 'event';
    else if (a.entity_type === 'auth') type = 'security';
    return {
      id: a.id,
      type,
      title: humanizeAction(a.action, a.entity_type),
      description: a.description || '',
      createdAt: a.created_at || a.createdAt,
      link: linkForActivity(a),
    };
  });

  const unread = items.filter((i) => !readIds.has(i.id));

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

  const markAllRead = () => {
    const next = new Set(readIds);
    items.forEach((i) => next.add(i.id));
    setReadIds(next);
    setReadIdsState(next);
  };

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    setReadIdsState(next);
  };

  const handleClick = (item: NotificationItem) => {
    markRead(item.id);
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
              const isRead = readIds.has(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${
                    isRead ? 'opacity-70' : 'bg-blue-50/30'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      n.type === 'message' ? 'bg-green-100 text-green-600'
                        : n.type === 'member' ? 'bg-blue-100 text-blue-600'
                        : n.type === 'event' ? 'bg-purple-100 text-purple-600'
                        : n.type === 'security' ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    {n.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{n.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  {!isRead && (
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

function humanizeAction(action?: string, entity?: string): string {
  if (!action) return 'Activity';
  const a = action.toLowerCase();
  const e = (entity || '').toLowerCase();
  if (a === 'login') return 'Login alert';
  if (a === 'register') return 'New registration';
  if (a === 'create' && e === 'user') return 'New member added';
  if (a === 'create' && e === 'event') return 'Event created';
  if (a === 'update' && e === 'event') return 'Event updated';
  if (a === 'update' && e === 'user') return 'Member updated';
  if (a === 'delete') return `${e || 'Item'} removed`;
  return `${action} ${entity || ''}`.trim();
}

function linkForActivity(a: any): string | undefined {
  if (!a) return;
  if (a.entity_type === 'event' && a.entity_id) return `/events`;
  if (a.entity_type === 'user') return `/people`;
  return undefined;
}

export default NotificationBell;
