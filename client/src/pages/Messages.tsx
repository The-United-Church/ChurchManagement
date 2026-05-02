import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/hooks/useAuthQuery';
import {
  subscribeConversations,
  subscribeMessages,
  sendMessage,
  markConversationRead,
  getOrCreateConversation,
  editMessage,
  deleteMessageForEveryone,
  deleteMessageForMe,
  rescheduleMessage,
  sendScheduledMessage,
  archiveConversationForUser,
  deleteConversationForUser,
  fetchOlderMessages,
  uploadChatAttachment,
  visibleConversations,
} from '@/lib/chat';
import type { Conversation, Message, ChatParticipant } from '@/lib/chat';
import { fetchUsersDirectoryApi } from '@/lib/api';
import type { DirectoryUserDTO } from '@/lib/api';
import { playMessageBeep, registerMessageSoundUnlock } from '@/lib/messageSound';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ConversationSidebar from '@/components/messages/ConversationSidebar';
import MessageThread from '@/components/messages/MessageThread';
import ProfileDialog from '@/components/messages/ProfileDialog';
import type { ChatProfileState } from '@/components/messages/ProfileDialog';

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
} | null;

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');

  const me: ChatParticipant | null = user
    ? {
        id: user.id,
        full_name: user.full_name || user.email,
        email: user.email,
        profile_img: user.profile_img,
      }
    : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<DirectoryUserDTO[]>([]);
  const [showStartNew, setShowStartNew] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState(false);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [profileState, setProfileState] = useState<ChatProfileState>(null);
  // Holds the other participant while waiting for Firestore subscription to return the new conversation
  const [pendingOther, setPendingOther] = useState<ChatParticipant | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const skipNextAutoScrollRef = useRef(false);

  // ── Sound-notification tracking refs ────────────────────────────────────────
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const initialMessagesLoadedRef = useRef(false);
  const initialConvsLoadedRef = useRef(false);
  const prevConvUnreadRef = useRef<Record<string, number>>({});

  useEffect(() => {
    registerMessageSoundUnlock();
  }, []);

  // Subscribe to my conversations
  useEffect(() => {
    if (!me) return;
    return subscribeConversations(me.id, setConversations);
  }, [me?.id]);

  // Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(activeId, setMessages);
    if (me?.id) markConversationRead(activeId, me.id).catch(() => {});
    return unsub;
  }, [activeId, me?.id]);

  useEffect(() => {
    setOlderMessages([]);
    setHasMoreMessages(true);
  }, [activeId]);

  // Load directory for "Start new" picker
  useEffect(() => {
    if (!showStartNew) return;
    fetchUsersDirectoryApi(search).then((r) => setPeople(r.data || [])).catch(() => setPeople([]));
  }, [showStartNew, search]);

  const visibleConversationRows = useMemo(
    () => (me ? visibleConversations(conversations, me.id, showArchived) : []),
    [conversations, me?.id, showArchived],
  );

  // Reset per-conversation seen state when switching conversations
  useEffect(() => {
    seenMessageIdsRef.current = new Set();
    initialMessagesLoadedRef.current = false;
  }, [activeId]);

  // Beep when a new incoming message arrives in the active conversation
  useEffect(() => {
    if (!me?.id || messages.length === 0) return;
    if (!initialMessagesLoadedRef.current) {
      // Seed known IDs on first load — don't beep for history
      messages.forEach((m) => seenMessageIdsRef.current.add(m.id));
      initialMessagesLoadedRef.current = true;
      return;
    }
    let hasNewIncoming = false;
    for (const m of messages) {
      if (!seenMessageIdsRef.current.has(m.id)) {
        if (m.senderId !== me.id) hasNewIncoming = true;
        seenMessageIdsRef.current.add(m.id);
      }
    }
    if (hasNewIncoming) playMessageBeep();
  }, [messages, me?.id]);

  // Beep when a *different* conversation receives a new unread message
  useEffect(() => {
    if (!me?.id || conversations.length === 0) return;
    if (!initialConvsLoadedRef.current) {
      conversations.forEach((c) => {
        prevConvUnreadRef.current[c.id] = c.unread?.[me.id] || 0;
      });
      initialConvsLoadedRef.current = true;
      return;
    }
    let shouldBeep = false;
    for (const c of conversations) {
      const curr = c.unread?.[me.id] || 0;
      const prev = prevConvUnreadRef.current[c.id] ?? curr;
      if (c.id !== activeId && curr > prev) shouldBeep = true;
      prevConvUnreadRef.current[c.id] = curr;
    }
    if (shouldBeep) playMessageBeep();
  }, [conversations, me?.id, activeId]);

  const active = useMemo(() => {
    const found = visibleConversationRows.find((c) => c.id === activeId) || conversations.find((c) => c.id === activeId);
    if (found) return found;
    // Synthetic placeholder while Firestore subscription hasn't returned the new conversation yet
    if (activeId && pendingOther && me) {
      return {
        id: activeId,
        participantIds: [me.id, pendingOther.id].sort(),
        participants: { [me.id]: me, [pendingOther.id]: pendingOther },
        lastMessage: '',
        lastMessageAt: null,
        unread: {},
      } as Conversation;
    }
    return undefined;
  }, [visibleConversationRows, conversations, activeId, pendingOther, me]);

  // Clear pending once the real conversation arrives in the subscription
  useEffect(() => {
    if (pendingOther && conversations.find((c) => c.id === activeId)) {
      setPendingOther(null);
    }
  }, [conversations, activeId, pendingOther]);

  const other: ChatParticipant | undefined = useMemo(() => {
    if (!active || !me) return undefined;
    const otherId = active.participantIds.find((id) => id !== me.id);
    return otherId ? active.participants?.[otherId] : undefined;
  }, [active, me?.id]);

  // Client-side scheduled send worker for due messages in the open conversation.
  useEffect(() => {
    if (!activeId || !me?.id || !other?.id) return;
    const timers = messages
      .filter((m) => m.senderId === me.id && m.status === 'scheduled' && m.scheduledFor?.toDate)
      .map((m) => {
        const delay = Math.max(0, m.scheduledFor!.toDate().getTime() - Date.now());
        return window.setTimeout(() => {
          sendScheduledMessage(activeId, m, other.id).catch(console.error);
        }, delay);
      });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [activeId, messages, me?.id, other?.id]);

  const visibleMessages = useMemo(() => {
    if (!me?.id) return [];
    const clearBefore = active?.clearBefore?.[me.id]?.toMillis?.() ?? 0;
    const merged = [...olderMessages, ...messages];
    const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());
    unique.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    return unique.filter((m) => {
      if (m.deletedFor?.[me.id]) return false;
      const messageTime = m.sentAt?.toMillis?.() ?? m.createdAt?.toMillis?.() ?? 0;
      if (messageTime <= clearBefore) return false;
      if (m.status !== 'scheduled') return true;
      return m.senderId === me.id;
    });
  }, [olderMessages, messages, active?.clearBefore, me?.id]);

  const loadOlderMessages = async () => {
    if (!activeId || loadingOlder || !hasMoreMessages) return;
    const first = visibleMessages.find((m) => m.createdAt?.toDate);
    if (!first?.createdAt) return;
    const scroller = messagesScrollRef.current;
    const previousHeight = scroller?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const older = await fetchOlderMessages(activeId, first.createdAt, 50);
      skipNextAutoScrollRef.current = true;
      setOlderMessages((current) => {
        const merged = [...older, ...current];
        return Array.from(new Map(merged.map((m) => [m.id, m])).values());
      });
      setHasMoreMessages(older.length === 50);
      requestAnimationFrame(() => {
        if (scroller) scroller.scrollTop = scroller.scrollHeight - previousHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    if (!activeId || loadingOlder) return;
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ block: 'end' }));
  }, [activeId, visibleMessages.length, loadingOlder]);

  const canEditMessage = (message: Message) => {
    if (message.senderId !== me?.id || message.deletedAt) return false;
    if (message.status === 'scheduled') return true;
    const sentAt = message.sentAt?.toDate?.() || message.createdAt?.toDate?.();
    return Boolean(sentAt && Date.now() - sentAt.getTime() <= 5 * 60 * 1000);
  };

  const canDeleteMessageForEveryone = (message: Message) => {
    if (message.senderId !== me?.id || message.deletedAt) return false;
    if (message.status === 'scheduled') return true;
    const sentAt = message.sentAt?.toDate?.() || message.createdAt?.toDate?.();
    return Boolean(sentAt && Date.now() - sentAt.getTime() <= 5 * 60 * 1000);
  };

  const confirmDelete = (state: ConfirmState) => setConfirmState(state);

  const runConfirm = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const requestDeleteMessageForMe = (message: Message) => {
    if (!activeId || !me?.id) return;
    confirmDelete({
      title: 'Delete message for you?',
      description: 'This removes the message from your chat only. Other participants may still see it.',
      confirmLabel: 'Delete for me',
      onConfirm: () => deleteMessageForMe(activeId, message.id, me.id),
    });
  };

  const requestDeleteMessageForEveryone = (message: Message) => {
    if (!activeId) return;
    if (!canDeleteMessageForEveryone(message)) return;
    confirmDelete({
      title: 'Delete message for everyone?',
      description: 'This will remove the message content and attachment for everyone in this conversation.',
      confirmLabel: 'Delete for everyone',
      onConfirm: () => deleteMessageForEveryone(activeId, message.id),
    });
  };

  const requestDeleteConversationForMe = (conversationId: string) => {
    if (!me?.id) return;
    confirmDelete({
      title: 'Delete conversation for you?',
      description: 'This clears the chat from your inbox and hides all current messages for you. New messages will start a fresh visible thread.',
      confirmLabel: 'Delete for me',
      onConfirm: async () => {
        await deleteConversationForUser(conversationId, me.id);
        if (conversationId === activeId) setParams({});
      },
    });
  };

  const openParticipantProfile = async (participant: ChatParticipant) => {
    setProfileState({ participant, profile: null, loading: true });
    try {
      const query = participant.email || participant.full_name;
      const response = await fetchUsersDirectoryApi(query);
      const found = response.data.find((person) => person.id === participant.id) || null;
      setProfileState((current) => (
        current?.participant.id === participant.id
          ? { participant, profile: found, loading: false }
          : current
      ));
    } catch {
      setProfileState((current) => (
        current?.participant.id === participant.id
          ? { participant, profile: null, loading: false }
          : current
      ));
    }
  };

  const toDateTimeLocal = (date: Date) => {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const startEditingMessage = (message: Message) => {
    setEditingMessage(message);
    setText(message.text || '');
    setSelectedFile(null);
    setScheduledAt(message.scheduledFor?.toDate ? toDateTimeLocal(message.scheduledFor.toDate()) : '');
  };

  const resetComposer = () => {
    setText('');
    setSelectedFile(null);
    setScheduledAt('');
    setEditingMessage(null);
  };

  const handleSend = async () => {
    if (!activeId || !me || !other || (!text.trim() && !selectedFile)) return;
    if (sending) return;
    const t = text;
    const file = selectedFile;
    const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
    setSending(true);
    try {
      if (editingMessage) {
        if (!canEditMessage(editingMessage)) return;
        await editMessage(activeId, editingMessage.id, t);
        if (editingMessage.status === 'scheduled' && scheduleDate && scheduleDate.getTime() > Date.now()) {
          await rescheduleMessage(activeId, editingMessage.id, scheduleDate);
        }
      } else {
        const attachment = file ? await uploadChatAttachment(file) : null;
        await sendMessage(activeId, me.id, other.id, t, {
          attachment,
          scheduledFor: scheduleDate && scheduleDate.getTime() > Date.now() ? scheduleDate : null,
        });
      }
      resetComposer();
    } catch (e) {
      console.error(e);
      setText(t);
    } finally {
      setSending(false);
    }
  };

  const allowDM = profile?.settings?.privacy?.allowDirectMessage !== false;

  if (!user || !me) {
    return <div className="p-6 text-center text-gray-500">Sign in to view messages.</div>;
  }

  return (
    <>
      <div className="flex h-[calc(100dvh-3.5rem)] bg-white">
        <ConversationSidebar
          me={me}
          visibleConversationRows={visibleConversationRows}
          activeId={activeId}
          search={search}
          setSearch={setSearch}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          showStartNew={showStartNew}
          setShowStartNew={setShowStartNew}
          people={people}
          onSelectConversation={(id) => { setParams({ c: id }); setShowStartNew(false); }}
          onArchiveConversation={(id, archive) => {
            archiveConversationForUser(id, me.id, archive).catch(console.error);
            if (id === activeId) setParams({});
          }}
          onDeleteConversation={requestDeleteConversationForMe}
          onStartNewChat={async (participant) => {
            setPendingOther(participant);
            const id = await getOrCreateConversation(me, participant);
            setShowStartNew(false);
            setParams({ c: id });
          }}
          onNavigateBack={() => navigate('/dashboard')}
        />

        <section className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {!active && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a conversation to start chatting</p>
              </div>
            </div>
          )}

          {active && other && (
            <MessageThread
              active={active}
              other={other}
              me={me}
              visibleMessages={visibleMessages}
              loadOlderMessages={loadOlderMessages}
              loadingOlder={loadingOlder}
              hasMoreMessages={hasMoreMessages}
              messagesScrollRef={messagesScrollRef}
              messagesEndRef={messagesEndRef}
              fileInputRef={fileInputRef}
              editingMessage={editingMessage}
              text={text}
              setText={setText}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
              sending={sending}
              allowDM={allowDM}
              canEditMessage={canEditMessage}
              canDeleteForEveryone={canDeleteMessageForEveryone}
              onSend={handleSend}
              onResetComposer={resetComposer}
              onStartEdit={startEditingMessage}
              onDeleteForMe={requestDeleteMessageForMe}
              onDeleteForEveryone={requestDeleteMessageForEveryone}
              onOpenProfile={openParticipantProfile}
              onArchive={() => archiveConversationForUser(active.id, me.id, !active.archivedFor?.[me.id])}
              onDeleteConversation={() => requestDeleteConversationForMe(active.id)}
              onBack={() => setParams({})}
            />
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        confirmLabel={confirmState?.confirmLabel || 'Delete'}
        loading={confirmLoading}
        onConfirm={runConfirm}
      />

      <ProfileDialog
        profileState={profileState}
        onClose={() => setProfileState(null)}
      />
    </>
  );
};

export default MessagesPage;
