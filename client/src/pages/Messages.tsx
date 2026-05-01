import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Send, Search, MessageCircle, ArrowLeft, ChevronLeft, Paperclip,
  CalendarClock, X, Edit3, Trash2, Archive, ArchiveRestore, Image as ImageIcon,
  FileText,
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
  uploadChatAttachment,
  visibleConversations,
} from '@/lib/chat';
import type { Conversation, Message, ChatParticipant } from '@/lib/chat';
import { fetchUsersDirectoryApi } from '@/lib/api';
import type { DirectoryUserDTO } from '@/lib/api';
import { playMessageBeep, registerMessageSoundUnlock } from '@/lib/messageSound';
import { formatDistanceToNow } from 'date-fns';

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
  // Holds the other participant while waiting for Firestore subscription to return the new conversation
  const [pendingOther, setPendingOther] = useState<ChatParticipant | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    return messages.filter((m) => {
      if (m.deletedFor?.[me.id]) return false;
      if (m.status !== 'scheduled') return true;
      return m.senderId === me.id;
    });
  }, [messages, me?.id]);

  const canEditMessage = (message: Message) => {
    if (message.senderId !== me?.id || message.deletedAt) return false;
    if (message.status === 'scheduled') return true;
    const sentAt = message.sentAt?.toDate?.() || message.createdAt?.toDate?.();
    return Boolean(sentAt && Date.now() - sentAt.getTime() <= 5 * 60 * 1000);
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
                    title="Delete conversation"
                    onClick={() => {
                      deleteConversationForUser(c.id, me.id).catch(console.error);
                      if (c.id === activeId) setParams({});
                    }}
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
                        email: p.email,
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
              <Avatar className="h-9 w-9">
                {other.profile_img && <AvatarImage src={other.profile_img} />}
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {other.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{other.full_name}</p>
                <p className="text-[11px] text-gray-500 truncate">{other.email}</p>
              </div>
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
                  onClick={() => {
                    deleteConversationForUser(active.id, me.id).then(() => setParams({})).catch(console.error);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
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
                            onClick={() => {
                              if (mine) deleteMessageForEveryone(activeId, m.id).catch(console.error);
                              else deleteMessageForMe(activeId, m.id, me.id).catch(console.error);
                            }}
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
  );
};

export default MessagesPage;
