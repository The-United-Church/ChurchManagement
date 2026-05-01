import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { subscribeConversations } from '@/lib/chat';
import { playMessageBeep, registerMessageSoundUnlock } from '@/lib/messageSound';

export default function MessageAlertSound() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  const initialLoadedRef = useRef(false);
  const previousUnreadRef = useRef<Record<string, number>>({});

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    registerMessageSoundUnlock();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    initialLoadedRef.current = false;
    previousUnreadRef.current = {};

    return subscribeConversations(user.id, (rows) => {
      if (!initialLoadedRef.current) {
        rows.forEach((conversation) => {
          previousUnreadRef.current[conversation.id] = conversation.unread?.[user.id] || 0;
        });
        initialLoadedRef.current = true;
        return;
      }

      let shouldBeep = false;
      for (const conversation of rows) {
        const currentUnread = conversation.unread?.[user.id] || 0;
        const previousUnread = previousUnreadRef.current[conversation.id] ?? currentUnread;
        if (
          !pathnameRef.current.startsWith('/messages')
          && conversation.lastSenderId !== user.id
          && currentUnread > previousUnread
        ) {
          shouldBeep = true;
        }
        previousUnreadRef.current[conversation.id] = currentUnread;
      }

      if (shouldBeep) playMessageBeep();
    });
  }, [user?.id]);

  return null;
}