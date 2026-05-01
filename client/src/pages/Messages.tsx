import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Send, Search, MessageCircle, ArrowLeft, ChevronLeft, Paperclip,
  CalendarClock, X, Edit3, Trash2, Archive, ArchiveRestore, Image as ImageIcon,
  FileText, User, Phone, Mail, MapPin, Calendar, Heart, Briefcase, Building2,
  BadgeCheck, Link as LinkIcon, Users, ExternalLink, Loader2,
} from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
} | null;

type ChatProfileState = {
  participant: ChatParticipant;
  profile: DirectoryUserDTO | null;
  loading: boolean;
} | null;

const nameForDirectoryUser = (person?: DirectoryUserDTO | null, fallback?: ChatParticipant) => {
  const fullName = person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(' ');
  return fullName || fallback?.full_name || person?.email || fallback?.email || 'Member';
};

const formatProfileValue = (value?: string | number | boolean | null) => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).replace(/_/g, ' ');
};

const hasProfileValue = (...values: Array<string | number | boolean | null | undefined>) => (
  values.some((value) => Boolean(formatProfileValue(value)))
);

const formatBirthday = (dob?: string | null) => {
  if (!dob) return '';
  const yearMasked = dob.startsWith('0000-');
  const dateStr = yearMasked ? '2000' + dob.slice(4) : dob;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return yearMasked
    ? date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const readableDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

const externalUrl = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

const ProfileField: React.FC<{
  icon: React.ElementType;
  label: string;
  value?: string | number | boolean | null;
  href?: string | null;
}> = ({ icon: Icon, label, value, href }) => {
  const display = formatProfileValue(value);
  if (!display) return null;
  return (
    <div className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase text-gray-500">{label}</p>
        {href ? (
          <a href={externalUrl(href)} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-blue-600 hover:text-blue-700">
            <span className="truncate">{display}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <p className="break-words text-sm font-medium capitalize text-gray-900">{display}</p>
        )}
      </div>
    </div>
  );
};

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

  const fileSizeLabel = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
      {/* Sidebar */}
      <aside className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-gray-200`}>
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-100 text-gray-500 shrink-0"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold flex-1">Messages</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Inbox' : 'Archived'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowStartNew(true)}>
            New
          </Button>
        </div>

        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleConversationRows.length === 0 && !showStartNew && (
            <div className="p-6 text-center">
              <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{showArchived ? 'No archived conversations.' : 'No conversations yet.'}</p>
              <Button size="sm" variant="link" onClick={() => setShowStartNew(true)}>
                Start a conversation
              </Button>
            </div>
          )}

          {visibleConversationRows
            .filter((c) => {
              if (!search.trim()) return true;
              const otherId = c.participantIds.find((id) => id !== me.id);
              const o = otherId ? c.participants?.[otherId] : undefined;
              return o?.full_name?.toLowerCase().includes(search.toLowerCase());
            })
            .map((c) => {
              const otherId = c.participantIds.find((id) => id !== me.id);
              const o = otherId ? c.participants?.[otherId] : undefined;
              const unread = c.unread?.[me.id] || 0;
              const isActive = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 ${
                    isActive ? 'bg-blue-50' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setParams({ c: c.id });
                      setShowStartNew(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Avatar className="h-10 w-10">
                      {o?.profile_img && <AvatarImage src={o.profile_img} />}
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                        {(o?.full_name || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{o?.full_name || 'Unknown'}</p>
                        {unread > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{c.lastMessage || 'No messages yet'}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title={showArchived ? 'Unarchive' : 'Archive'}
                    onClick={() => {
                      archiveConversationForUser(c.id, me.id, !showArchived).catch(console.error);
                      if (c.id === activeId) setParams({});
                    }}
                  >
                    {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete conversation for me"
                    onClick={() => requestDeleteConversationForMe(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                </div>
              );
            })}

          {showStartNew && (
            <div className="p-2 border-t bg-gray-50">
              <p className="text-xs uppercase font-semibold text-gray-500 px-2 py-1">Start a new chat</p>
              {people
                .filter((p) => p.id !== me.id)
                .slice(0, 30)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      const participant: ChatParticipant = {
                        id: p.id,
                        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
                        email: p.email || '',
                        profile_img: p.profile_img,
                      };
                      setPendingOther(participant);
                      const id = await getOrCreateConversation(me, participant);
                      setShowStartNew(false);
                      setParams({ c: id });
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-7 w-7">
                        {p.profile_img && <AvatarImage src={p.profile_img} />}
                        <AvatarFallback className="text-[10px] bg-gray-200">
                          {(p.full_name || p.email).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {p.is_online === true && (
                        <span
                          aria-label="Online"
                          title="Online"
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                        />
                      )}
                    </div>
                    <span className="truncate">{p.full_name || p.email}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </aside>

      {/* Chat panel */}
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
          <>
            <header className="border-b border-gray-200 px-3 py-2 flex items-center gap-2">
              <button
                type="button"
                className="md:hidden p-1 rounded hover:bg-gray-100"
                onClick={() => setParams({})}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button type="button" className="rounded-full" onClick={() => openParticipantProfile(other)} aria-label={`View ${other.full_name} profile`}>
                <Avatar className="h-9 w-9">
                  {other.profile_img && <AvatarImage src={other.profile_img} />}
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {other.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              <button type="button" className="min-w-0 text-left" onClick={() => openParticipantProfile(other)}>
                <p className="text-sm font-semibold truncate">{other.full_name}</p>
                <p className="text-[11px] text-gray-500 truncate">{other.email}</p>
              </button>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className="rounded p-2 text-gray-500 hover:bg-gray-100"
                  title={active.archivedFor?.[me.id] ? 'Unarchive conversation' : 'Archive conversation'}
                  onClick={() => archiveConversationForUser(active.id, me.id, !active.archivedFor?.[me.id])}
                >
                  {active.archivedFor?.[me.id] ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  title="Delete conversation for me"
                  onClick={() => requestDeleteConversationForMe(active.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

              </div>
            </header>

            <div
              ref={messagesScrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50"
              onScroll={(e) => {
                if (e.currentTarget.scrollTop < 80) loadOlderMessages().catch(console.error);
              }}
            >
              {hasMoreMessages && visibleMessages.length > 0 && (
                <div className="mb-3 text-center">
                  <Button type="button" size="sm" variant="ghost" onClick={() => loadOlderMessages().catch(console.error)} disabled={loadingOlder}>
                    {loadingOlder ? 'Loading…' : 'Load older messages'}
                  </Button>
                </div>
              )}
              {visibleMessages.map((m) => {
                const mine = m.senderId === me.id;
                const deleted = Boolean(m.deletedAt);
                const scheduled = m.status === 'scheduled';
                return (
                  <div
                    key={m.id}
                    className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`group max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        mine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                      }`}
                    >
                      {deleted ? (
                        <p className="italic opacity-80">This message was deleted</p>
                      ) : (
                        <>
                          {m.attachment && (
                            <a
                              href={m.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mb-2 flex items-center gap-2 rounded-lg border px-2 py-2 ${mine ? 'border-blue-300 bg-blue-500/40 text-white' : 'border-gray-200 bg-gray-50 text-gray-800'}`}
                            >
                              {m.attachment.contentType.startsWith('image/') ? (
                                <img src={m.attachment.url} alt={m.attachment.name} className="h-24 w-24 rounded object-cover" />
                              ) : (
                                <FileText className="h-5 w-5 shrink-0" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium">{m.attachment.name}</span>
                                <span className={`block text-[10px] ${mine ? 'text-blue-100' : 'text-gray-500'}`}>{fileSizeLabel(m.attachment.size)}</span>
                              </span>
                            </a>
                          )}
                          {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        </>
                      )}
                      <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                        {scheduled && m.scheduledFor?.toDate
                          ? `Scheduled ${formatDistanceToNow(m.scheduledFor.toDate(), { addSuffix: true })}`
                          : m.createdAt?.toDate
                            ? formatDistanceToNow(m.createdAt.toDate(), { addSuffix: true })
                            : 'sending…'}
                        {m.editedAt && !deleted ? ' · edited' : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        {canEditMessage(m) && (
                          <button
                            type="button"
                            className={`rounded px-2 py-1 text-[10px] ${mine ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => startEditingMessage(m)}
                          >
                            <Edit3 className="mr-1 inline h-3 w-3" />
                            Edit
                          </button>
                        )}
                        {!deleted && (
                          <button
                            type="button"
                            className={`rounded px-2 py-1 text-[10px] ${mine ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            onClick={() => requestDeleteMessageForMe(m)}
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" />
                            Delete for me
                          </button>
                        )}
                        {!deleted && mine && canDeleteMessageForEveryone(m) && (
                          <button
                            type="button"
                            className="rounded bg-red-500 px-2 py-1 text-[10px] text-white hover:bg-red-600"
                            onClick={() => requestDeleteMessageForEveryone(m)}
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" />
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-3 bg-white">
              {!allowDM && (
                <p className="text-xs text-amber-600 mb-2">
                  Direct messaging is disabled in your privacy settings — others cannot reply.
                </p>
              )}
              {editingMessage && (
                <div className="mb-2 flex items-center justify-between rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <span>{editingMessage.status === 'scheduled' ? 'Editing scheduled message' : 'Editing message'}</span>
                  <button type="button" onClick={resetComposer} className="rounded p-1 hover:bg-blue-100" aria-label="Cancel edit">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {selectedFile && (
                <div className="mb-2 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <span className="flex min-w-0 items-center gap-2">
                    {selectedFile.type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    <span className="truncate">{selectedFile.name}</span>
                    <span className="text-gray-400">{fileSizeLabel(selectedFile.size)}</span>
                  </span>
                  <button type="button" onClick={() => setSelectedFile(null)} className="rounded p-1 hover:bg-gray-100" aria-label="Remove file">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {scheduledAt && (
                <div className="mb-2 flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <span>Scheduled for {new Date(scheduledAt).toLocaleString()}</span>
                  <button type="button" onClick={() => setScheduledAt('')} className="rounded p-1 hover:bg-amber-100" aria-label="Clear schedule">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={Boolean(editingMessage)}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  type="datetime-local"
                  className="hidden w-[210px] sm:block"
                  value={scheduledAt}
                  min={toDateTimeLocal(new Date(Date.now() + 60_000))}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={Boolean(editingMessage && editingMessage.status !== 'scheduled')}
                />
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={editingMessage ? 'Edit your message…' : 'Write a message…'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" className="sm:hidden" onClick={() => {
                  const value = window.prompt('Schedule for (YYYY-MM-DD HH:mm)', scheduledAt.replace('T', ' '));
                  if (value) setScheduledAt(value.replace(' ', 'T'));
                }}>
                  <CalendarClock className="h-4 w-4" />
                </Button>
                <Button onClick={handleSend} disabled={sending || (!text.trim() && !selectedFile)}>
                  {scheduledAt && !editingMessage ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
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
    <Dialog open={Boolean(profileState)} onOpenChange={(open) => !open && setProfileState(null)}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-gray-100 px-5 py-4 pr-12">
          <DialogTitle>Member Profile</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-5">
          {profileState && (
            <>
              <div className="flex items-center gap-4 py-4">
                <Avatar className="h-16 w-16">
                  {(profileState.profile?.profile_img || profileState.participant.profile_img) && (
                    <AvatarImage src={profileState.profile?.profile_img || profileState.participant.profile_img} />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {nameForDirectoryUser(profileState.profile, profileState.participant).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold text-gray-900">{nameForDirectoryUser(profileState.profile, profileState.participant)}</h3>
                  <p className="text-sm capitalize text-gray-500">{profileState.profile?.role || 'Member'}</p>
                </div>
                {profileState.loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
              </div>

              {!profileState.loading && !profileState.profile && (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
                  This member has not shared profile details in the directory.
                </div>
              )}

              {profileState.profile && (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Contact</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ProfileField icon={Mail} label="Email" value={profileState.profile.email} />
                      <ProfileField icon={Phone} label="Phone" value={profileState.profile.phone_number} />
                      <ProfileField icon={MessageCircle} label="WhatsApp" value={profileState.profile.phone_is_whatsapp ? 'Yes' : ''} />
                      <ProfileField icon={BadgeCheck} label="Status" value={profileState.profile.is_active === false ? 'Inactive' : 'Active'} />
                    </div>
                  </section>

                  {hasProfileValue(
                    profileState.profile.username,
                    profileState.profile.gender,
                    profileState.profile.dob,
                    profileState.profile.marital_status,
                    profileState.profile.date_married,
                  ) && (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Personal</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ProfileField icon={User} label="Username" value={profileState.profile.username} />
                        <ProfileField icon={User} label="Gender" value={profileState.profile.gender} />
                        <ProfileField icon={Calendar} label="Birthday" value={formatBirthday(profileState.profile.dob)} />
                        <ProfileField icon={Heart} label="Marital Status" value={profileState.profile.marital_status} />
                        <ProfileField icon={Calendar} label="Date Married" value={readableDate(profileState.profile.date_married)} />
                        <ProfileField icon={Phone} label="Accepts Texts" value={profileState.profile.is_accept_text === true ? 'Yes' : ''} />
                      </div>
                    </section>
                  )}

                  {hasProfileValue(
                    profileState.profile.job_title,
                    profileState.profile.employer,
                  ) && (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Work</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ProfileField icon={Briefcase} label="Job Title" value={profileState.profile.job_title} />
                        <ProfileField icon={Building2} label="Employer" value={profileState.profile.employer} />
                      </div>
                    </section>
                  )}

                  {hasProfileValue(
                    profileState.profile.member_status,
                    profileState.profile.grade,
                    profileState.profile.baptism_date,
                    profileState.profile.baptism_location,
                  ) && (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Membership</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ProfileField icon={BadgeCheck} label="Member Status" value={profileState.profile.member_status} />
                        <ProfileField icon={User} label="Grade" value={profileState.profile.grade} />
                        <ProfileField icon={Calendar} label="Baptism Date" value={readableDate(profileState.profile.baptism_date)} />
                        <ProfileField icon={MapPin} label="Baptism Location" value={profileState.profile.baptism_location} />
                      </div>
                    </section>
                  )}

                  {hasProfileValue(
                    profileState.profile.address_line,
                    profileState.profile.city,
                    profileState.profile.state,
                    profileState.profile.country,
                    profileState.profile.postal_code,
                  ) && (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Location</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ProfileField icon={MapPin} label="Address" value={profileState.profile.address_line} />
                        <ProfileField icon={MapPin} label="City" value={profileState.profile.city} />
                        <ProfileField icon={MapPin} label="State" value={profileState.profile.state} />
                        <ProfileField icon={MapPin} label="Country" value={profileState.profile.country} />
                        <ProfileField icon={MapPin} label="Postal Code" value={profileState.profile.postal_code} />
                      </div>
                    </section>
                  )}

                  {hasProfileValue(
                    profileState.profile.facebook_link,
                    profileState.profile.instagram_link,
                    profileState.profile.linkedin_link,
                    profileState.profile.twitter_link,
                    profileState.profile.whatsapp_link,
                    profileState.profile.website_link,
                  ) && (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Social</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ProfileField icon={LinkIcon} label="Facebook" value={profileState.profile.facebook_link} href={profileState.profile.facebook_link} />
                        <ProfileField icon={LinkIcon} label="Instagram" value={profileState.profile.instagram_link} href={profileState.profile.instagram_link} />
                        <ProfileField icon={LinkIcon} label="LinkedIn" value={profileState.profile.linkedin_link} href={profileState.profile.linkedin_link} />
                        <ProfileField icon={LinkIcon} label="X / Twitter" value={profileState.profile.twitter_link} href={profileState.profile.twitter_link} />
                        <ProfileField icon={LinkIcon} label="WhatsApp" value={profileState.profile.whatsapp_link} href={profileState.profile.whatsapp_link} />
                        <ProfileField icon={LinkIcon} label="Website" value={profileState.profile.website_link} href={profileState.profile.website_link} />
                      </div>
                    </section>
                  )}

                  {profileState.profile.family_members && profileState.profile.family_members.length > 0 && (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Family Members</h4>
                      <div className="grid gap-2">
                        {profileState.profile.family_members.map((familyMember) => (
                          <div key={familyMember.id} className="flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                            <Users className="h-4 w-4 shrink-0 text-gray-500" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {[familyMember.first_name, familyMember.last_name].filter(Boolean).join(' ')}
                              </p>
                              <p className="text-xs capitalize text-gray-500">{familyMember.relationship}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default MessagesPage;
