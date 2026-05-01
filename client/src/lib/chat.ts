import {
  collection, addDoc, doc, query, where, orderBy, onSnapshot,
  serverTimestamp, setDoc, updateDoc, getDocs, getDoc, Timestamp, limit,
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase';

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
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
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
  const ref = doc(firebaseDb, 'conversations', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participantIds: [me.id, other.id].sort(),
      participants: { [me.id]: me, [other.id]: other },
      lastMessage: '',
      lastMessageAt: null,
      lastSenderId: '',
      unread: { [me.id]: 0, [other.id]: 0 },
    });
  }
  return id;
}

export function subscribeConversations(
  myId: string,
  cb: (rows: Conversation[]) => void
): () => void {
  const q = query(
    collection(firebaseDb, 'conversations'),
    where('participantIds', 'array-contains', myId),
    orderBy('lastMessageAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[];
    cb(rows);
  }, () => cb([]));
}

export function subscribeMessages(
  conversationId: string,
  cb: (rows: Message[]) => void
): () => void {
  const q = query(
    collection(firebaseDb, 'conversations', conversationId, 'messages'),
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
): Promise<void> {
  if (!text.trim()) return;
  await addDoc(collection(firebaseDb, 'conversations', conversationId, 'messages'), {
    conversationId,
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(firebaseDb, 'conversations', conversationId), {
    lastMessage: text.trim().slice(0, 280),
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    [`unread.${recipientId}`]: ((await getRecipientUnread(conversationId, recipientId)) ?? 0) + 1,
  });
}

async function getRecipientUnread(conversationId: string, recipientId: string): Promise<number> {
  const snap = await getDoc(doc(firebaseDb, 'conversations', conversationId));
  return (snap.data()?.unread?.[recipientId] as number) ?? 0;
}

export async function markConversationRead(conversationId: string, myId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, 'conversations', conversationId), {
    [`unread.${myId}`]: 0,
  });
}

/** Total unread across all conversations for a user. */
export function subscribeTotalUnread(
  myId: string,
  cb: (count: number) => void,
): () => void {
  return subscribeConversations(myId, (rows) => {
    const total = rows.reduce((sum, c) => sum + (c.unread?.[myId] || 0), 0);
    cb(total);
  });
}
