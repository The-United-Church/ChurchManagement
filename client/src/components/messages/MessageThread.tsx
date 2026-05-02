import React from 'react';
import {
  Send, ArrowLeft, Paperclip, CalendarClock, X, Edit3, Trash2,
  Archive, ArchiveRestore, Image as ImageIcon, FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation, Message, ChatParticipant } from '@/lib/chat';

const fileSizeLabel = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const toDateTimeLocal = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

interface MessageThreadProps {
  active: Conversation;
  other: ChatParticipant;
  me: ChatParticipant;
  visibleMessages: Message[];
  loadOlderMessages: () => Promise<void>;
  loadingOlder: boolean;
  hasMoreMessages: boolean;
  messagesScrollRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  editingMessage: Message | null;
  text: string;
  setText: (v: string) => void;
  selectedFile: File | null;
  setSelectedFile: (v: File | null) => void;
  scheduledAt: string;
  setScheduledAt: (v: string) => void;
  sending: boolean;
  allowDM: boolean;
  canEditMessage: (m: Message) => boolean;
  canDeleteForEveryone: (m: Message) => boolean;
  onSend: () => void;
  onResetComposer: () => void;
  onStartEdit: (m: Message) => void;
  onDeleteForMe: (m: Message) => void;
  onDeleteForEveryone: (m: Message) => void;
  onOpenProfile: (p: ChatParticipant) => void;
  onArchive: () => void;
  onDeleteConversation: () => void;
  onBack: () => void;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  active, other, me, visibleMessages, loadOlderMessages, loadingOlder, hasMoreMessages,
  messagesScrollRef, messagesEndRef, fileInputRef, editingMessage, text, setText,
  selectedFile, setSelectedFile, scheduledAt, setScheduledAt, sending, allowDM,
  canEditMessage, canDeleteForEveryone, onSend, onResetComposer, onStartEdit,
  onDeleteForMe, onDeleteForEveryone, onOpenProfile, onArchive, onDeleteConversation, onBack,
}) => (
  <>
    <header className="border-b border-gray-200 px-3 py-2 flex items-center gap-2">
      <button type="button" className="md:hidden p-1 rounded hover:bg-gray-100" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button type="button" className="rounded-full" onClick={() => onOpenProfile(other)} aria-label={`View ${other.full_name} profile`}>
        <Avatar className="h-9 w-9">
          {other.profile_img && <AvatarImage src={other.profile_img} />}
          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
            {other.full_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>
      <button type="button" className="min-w-0 text-left" onClick={() => onOpenProfile(other)}>
        <p className="text-sm font-semibold truncate">{other.full_name}</p>
        <p className="text-[11px] text-gray-500 truncate">{other.email}</p>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          className="rounded p-2 text-gray-500 hover:bg-gray-100"
          title={active.archivedFor?.[me.id] ? 'Unarchive conversation' : 'Archive conversation'}
          onClick={onArchive}
        >
          {active.archivedFor?.[me.id] ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
          title="Delete conversation for me"
          onClick={onDeleteConversation}
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
          <div key={m.id} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
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
                    onClick={() => onStartEdit(m)}
                  >
                    <Edit3 className="mr-1 inline h-3 w-3" />
                    Edit
                  </button>
                )}
                {!deleted && (
                  <button
                    type="button"
                    className={`rounded px-2 py-1 text-[10px] ${mine ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => onDeleteForMe(m)}
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" />
                    Delete for me
                  </button>
                )}
                {!deleted && mine && canDeleteForEveryone(m) && (
                  <button
                    type="button"
                    className="rounded bg-red-500 px-2 py-1 text-[10px] text-white hover:bg-red-600"
                    onClick={() => onDeleteForEveryone(m)}
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
          <button type="button" onClick={onResetComposer} className="rounded p-1 hover:bg-blue-100" aria-label="Cancel edit">
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
              onSend();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="sm:hidden"
          onClick={() => {
            const value = window.prompt('Schedule for (YYYY-MM-DD HH:mm)', scheduledAt.replace('T', ' '));
            if (value) setScheduledAt(value.replace(' ', 'T'));
          }}
        >
          <CalendarClock className="h-4 w-4" />
        </Button>
        <Button onClick={onSend} disabled={sending || (!text.trim() && !selectedFile)}>
          {scheduledAt && !editingMessage ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  </>
);

export default MessageThread;
