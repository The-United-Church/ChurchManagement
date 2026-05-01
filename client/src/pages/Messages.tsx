import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Search, MessageCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProfile } from '@/hooks/useAuthQuery';
import {
  subscribeConversations,
  subscribeMessages,
  sendMessage,
  markConversationRead,
  getOrCreateConversation,
} from '@/lib/chat';
import type { Conversation, Message, ChatParticipant } from '@/lib/chat';
import { fetchUsersDirectoryApi } from '@/lib/api';
import type { DirectoryUserDTO } from '@/lib/api';
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

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId],
  );
  const other: ChatParticipant | undefined = useMemo(() => {
    if (!active || !me) return undefined;
    const otherId = active.participantIds.find((id) => id !== me.id);
    return otherId ? active.participants?.[otherId] : undefined;
  }, [active, me?.id]);

  const handleSend = async () => {
    if (!activeId || !me || !other || !text.trim()) return;
    const t = text;
    setText('');
    try {
      await sendMessage(activeId, me.id, other.id, t);
    } catch (e) {
      console.error(e);
      setText(t);
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
          <h2 className="text-lg font-semibold flex-1">Messages</h2>
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
          {conversations.length === 0 && !showStartNew && (
            <div className="p-6 text-center">
              <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No conversations yet.</p>
              <Button size="sm" variant="link" onClick={() => setShowStartNew(true)}>
                Start a conversation
              </Button>
            </div>
          )}

          {conversations
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
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setParams({ c: c.id });
                    setShowStartNew(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 ${
                    isActive ? 'bg-blue-50' : ''
                  }`}
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
                      const id = await getOrCreateConversation(me, {
                        id: p.id,
                        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
                        email: p.email,
                        profile_img: p.profile_img,
                      });
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
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
              {messages.map((m) => {
                const mine = m.senderId === me.id;
                return (
                  <div
                    key={m.id}
                    className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        mine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                        {m.createdAt?.toDate
                          ? formatDistanceToNow(m.createdAt.toDate(), { addSuffix: true })
                          : 'sending…'}
                      </p>
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
              <div className="flex items-end gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button onClick={handleSend} disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
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
