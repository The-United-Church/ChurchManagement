import {
  collection, addDoc, doc, query, where, orderBy, onSnapshot,
  serverTimestamp, setDoc, updateDoc, getDoc, Timestamp, limit,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { firebaseDb, firebaseStorage } from '@/lib/firebase';

const CONVERSATIONS_COLLECTION = import.meta.env.VITE_CONVERSATIONS_COLLECTION || 'conversations';
const MESSAGES_COLLECTION = import.meta.env.VITE_MESSAGES_COLLECTION || 'messages';

export interface ChatParticipant {
  id: string;
  full_name: string;
  email: string;
  profile_img?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: Record<string, ChatParticipant>;
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  lastSenderId?: string;
  unread?: Record<string, number>;
  archivedFor?: Record<string, boolean>;
  hiddenFor?: Record<string, boolean>;
}

export interface ChatAttachment {
  name: string;
  url: string;
  contentType: string;
  size: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
  editedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
  deletedFor?: Record<string, boolean>;
  attachment?: ChatAttachment | null;
  status?: 'sent' | 'scheduled';
  scheduledFor?: Timestamp | null;
  sentAt?: Timestamp | null;
}

export interface SendMessageOptions {
  attachment?: ChatAttachment | null;
  scheduledFor?: Date | null;
}

/** Stable conversation id derived from participant IDs. */
export function conversationIdFor(a: string, b: string): string {
  return [a, b].sort().join('__');
}

/** Find or create a 1:1 conversation between two users. */
export async function getOrCreateConversation(
  me: ChatParticipant,
  other: ChatParticipant
): Promise<string> {
  const id = conversationIdFor(me.id, other.id);
  const ref = doc(firebaseDb, CONVERSATIONS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participantIds: [me.id, other.id].sort(),
      participants: { [me.id]: me, [other.id]: other },
      lastMessage: '',
      lastMessageAt: null,
      lastSenderId: '',
      unread: { [me.id]: 0, [other.id]: 0 },
      archivedFor: {},
      hiddenFor: {},
    });
  } else {
    await updateDoc(ref, {
      [`hiddenFor.${me.id}`]: false,
      [`hiddenFor.${other.id}`]: false,
    }).catch(() => {});
  }
  return id;
}

export function subscribeConversations(
  myId: string,
  cb: (rows: Conversation[]) => void
): () => void {
  const q = query(
    collection(firebaseDb, CONVERSATIONS_COLLECTION),
    where('participantIds', 'array-contains', myId),
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[];
    rows.sort((a, b) => {
      const aTime = a.lastMessageAt?.toMillis?.() ?? 0;
      const bTime = b.lastMessageAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
    cb(rows);
  }, (err) => {
    console.error('Failed to subscribe to conversations:', err);
    cb([]);
  });
}

export function visibleConversations(
  rows: Conversation[],
  myId: string,
  archived = false,
): Conversation[] {
  return rows.filter((row) => {
    if (row.hiddenFor?.[myId]) return false;
    return archived ? row.archivedFor?.[myId] === true : row.archivedFor?.[myId] !== true;
  });
}

export function subscribeMessages(
  conversationId: string,
  cb: (rows: Message[]) => void
): () => void {
  const q = query(
    collection(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION),
    orderBy('createdAt', 'asc'),
    limit(200),
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[];
    cb(rows);
  }, () => cb([]));
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  text: string,
  options: SendMessageOptions = {},
): Promise<void> {
  const cleanText = text.trim();
  const hasAttachment = Boolean(options.attachment);
  if (!cleanText && !hasAttachment) return;

  if (options.scheduledFor && options.scheduledFor.getTime() > Date.now()) {
    await addDoc(collection(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION), {
      conversationId,
      senderId,
      text: cleanText,
      attachment: options.attachment || null,
      status: 'scheduled',
      scheduledFor: Timestamp.fromDate(options.scheduledFor),
      createdAt: serverTimestamp(),
    });
    return;
  }

  await addDoc(collection(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION), {
    conversationId,
    senderId,
    text: cleanText,
    attachment: options.attachment || null,
    status: 'sent',
    createdAt: serverTimestamp(),
    sentAt: serverTimestamp(),
  });
  await updateConversationAfterSend(conversationId, senderId, recipientId, cleanText, options.attachment || null);
}

async function updateConversationAfterSend(
  conversationId: string,
  senderId: string,
  recipientId: string,
  text: string,
  attachment: ChatAttachment | null,
) {
  const preview = text || (attachment ? `Sent ${attachment.contentType.startsWith('image/') ? 'an image' : 'a file'}` : '');
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId), {
    lastMessage: preview.slice(0, 280),
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    [`unread.${recipientId}`]: ((await getRecipientUnread(conversationId, recipientId)) ?? 0) + 1,
    [`hiddenFor.${senderId}`]: false,
    [`hiddenFor.${recipientId}`]: false,
    [`archivedFor.${senderId}`]: false,
    [`archivedFor.${recipientId}`]: false,
  });
}

async function getRecipientUnread(conversationId: string, recipientId: string): Promise<number> {
  const snap = await getDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId));
  return (snap.data()?.unread?.[recipientId] as number) ?? 0;
}

export async function markConversationRead(conversationId: string, myId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId), {
    [`unread.${myId}`]: 0,
  });
}

export async function editMessage(conversationId: string, messageId: string, text: string): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION, messageId), {
    text: text.trim(),
    editedAt: serverTimestamp(),
  });
}

export async function deleteMessageForEveryone(conversationId: string, messageId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION, messageId), {
    text: '',
    attachment: null,
    deletedAt: serverTimestamp(),
  });
}

export async function deleteMessageForMe(conversationId: string, messageId: string, myId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION, messageId), {
    [`deletedFor.${myId}`]: true,
  });
}

export async function rescheduleMessage(
  conversationId: string,
  messageId: string,
  scheduledFor: Date,
): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION, messageId), {
    status: 'scheduled',
    scheduledFor: Timestamp.fromDate(scheduledFor),
    editedAt: serverTimestamp(),
  });
}

export async function sendScheduledMessage(
  conversationId: string,
  message: Message,
  recipientId: string,
): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION, message.id), {
    status: 'sent',
    scheduledFor: null,
    sentAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  await updateConversationAfterSend(conversationId, message.senderId, recipientId, message.text, message.attachment || null);
}

export async function archiveConversationForUser(
  conversationId: string,
  myId: string,
  archived: boolean,
): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId), {
    [`archivedFor.${myId}`]: archived,
  });
}

export async function deleteConversationForUser(conversationId: string, myId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, CONVERSATIONS_COLLECTION, conversationId), {
    [`hiddenFor.${myId}`]: true,
    [`archivedFor.${myId}`]: false,
    [`unread.${myId}`]: 0,
  });
}

export async function uploadChatAttachment(file: File): Promise<ChatAttachment> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `chat-attachments/${crypto.randomUUID()}-${safeName}`;
  const snap = await uploadBytes(storageRef(firebaseStorage, path), file, { contentType: file.type });
  const url = await getDownloadURL(snap.ref);
  return {
    name: file.name,
    url,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
  };
}

/** Total unread across all conversations for a user. */
export function subscribeTotalUnread(
  myId: string,
  cb: (count: number) => void,
): () => void {
  return subscribeConversations(myId, (rows) => {
    const total = visibleConversations(rows, myId).reduce((sum, c) => sum + (c.unread?.[myId] || 0), 0);
    cb(total);
  });
}
