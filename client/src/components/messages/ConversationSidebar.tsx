import React from 'react';
import { Search, MessageCircle, ChevronLeft, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Conversation, ChatParticipant } from '@/lib/chat';
import type { DirectoryUserDTO } from '@/lib/api';

interface ConversationSidebarProps {
  me: ChatParticipant;
  visibleConversationRows: Conversation[];
  activeId: string | null;
  search: string;
  setSearch: (v: string) => void;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  showStartNew: boolean;
  setShowStartNew: (v: boolean) => void;
  people: DirectoryUserDTO[];
  onSelectConversation: (id: string) => void;
  onArchiveConversation: (id: string, archive: boolean) => void;
  onDeleteConversation: (id: string) => void;
  onStartNewChat: (participant: ChatParticipant) => Promise<void>;
  onNavigateBack: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  me,
  visibleConversationRows,
  activeId,
  search,
  setSearch,
  showArchived,
  setShowArchived,
  showStartNew,
  setShowStartNew,
  people,
  onSelectConversation,
  onArchiveConversation,
  onDeleteConversation,
  onStartNewChat,
  onNavigateBack,
}) => (
  <aside className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-gray-200`}>
    <div className="p-3 border-b border-gray-100 flex items-center gap-2">
      <button
        type="button"
        className="p-1 rounded hover:bg-gray-100 text-gray-500 shrink-0"
        onClick={onNavigateBack}
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
              className={`w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 ${isActive ? 'bg-blue-50' : ''}`}
            >
              <button
                type="button"
                onClick={() => onSelectConversation(c.id)}
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
                onClick={() => onArchiveConversation(c.id, !showArchived)}
              >
                {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Delete conversation for me"
                onClick={() => onDeleteConversation(c.id)}
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
                onClick={() => {
                  const participant: ChatParticipant = {
                    id: p.id,
                    full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
                    email: p.email || '',
                    profile_img: p.profile_img,
                  };
                  onStartNewChat(participant);
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
);

export default ConversationSidebar;
