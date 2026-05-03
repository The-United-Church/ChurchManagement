import type { Person } from './person';

export type FollowUpType =
  | 'first_visit'
  | 'absent_member'
  | 'new_convert'
  | 'prayer_request'
  | 'pastoral_care'
  | 'hospital_visit'
  | 'birthday'
  | 'anniversary'
  | 'general';

export type FollowUpStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ContactMethod =
  | 'phone_call'
  | 'sms'
  | 'whatsapp'
  | 'email'
  | 'in_person'
  | 'other';

export type ContactOutcome =
  | 'reached'
  | 'no_answer'
  | 'left_message'
  | 'scheduled_callback'
  | 'wrong_contact';

export interface FollowUpUserRef {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  profile_image?: string;
}

export interface FollowUp {
  id: string;
  type: FollowUpType;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  person_id: string | null;
  user_id: string | null;
  assigned_to: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  notes: string | null;
  outcome_notes: string | null;
  related_event_id: string | null;
  is_escalated: boolean;
  branch_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  person?: Person | null;
  user?: FollowUpUserRef | null;
  assignee?: FollowUpUserRef | null;
  creator?: FollowUpUserRef | null;
}

export interface FollowUpContactLog {
  id: string;
  follow_up_id: string;
  method: ContactMethod;
  outcome: ContactOutcome;
  notes: string | null;
  contacted_at: string;
  contacted_by: string;
  created_at: string;
  contactor?: FollowUpUserRef | null;
}

export interface CreateFollowUpDTO {
  type?: FollowUpType;
  status?: FollowUpStatus;
  priority?: FollowUpPriority;
  person_id?: string | null;
  user_id?: string | null;
  assigned_to?: string | null;
  scheduled_date?: string | null;
  notes?: string | null;
  related_event_id?: string | null;
}

export interface UpdateFollowUpDTO {
  type?: FollowUpType;
  status?: FollowUpStatus;
  priority?: FollowUpPriority;
  assigned_to?: string | null;
  scheduled_date?: string | null;
  notes?: string | null;
  outcome_notes?: string | null;
}

export interface CreateContactLogDTO {
  method: ContactMethod;
  outcome: ContactOutcome;
  notes?: string | null;
  contacted_at?: string;
}

export interface FollowUpStats {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  completedThisMonth: number;
  pendingThisMonth: number;
  completionRate: number;
  byType: { type: FollowUpType; count: number }[];
  byAssignee: { assignee_id: string | null; assignee_name: string | null; count: number }[];
}

export interface FollowUpFunnel {
  visitors: number;
  withFollowUps: number;
  reached: number;
  converted: number;
}

export interface FollowUpFiltersState {
  status?: FollowUpStatus[];
  type?: FollowUpType[];
  priority?: FollowUpPriority[];
  assigneeId?: string;
  from?: string;
  to?: string;
  overdueOnly?: boolean;
  search?: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  branch_id: string;
  name: string;
  filters: FollowUpFiltersState;
  created_at: string;
}

// ─── Display helpers ──────────────────────────────────────────────────────
export const FOLLOWUP_TYPE_LABELS: Record<FollowUpType, string> = {
  first_visit: 'First Visit',
  absent_member: 'Absent Member',
  new_convert: 'New Convert',
  prayer_request: 'Prayer Request',
  pastoral_care: 'Pastoral Care',
  hospital_visit: 'Hospital Visit',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  general: 'General',
};

export const FOLLOWUP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const FOLLOWUP_PRIORITY_LABELS: Record<FollowUpPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  phone_call: 'Phone call',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
  in_person: 'In person',
  other: 'Other',
};

export const CONTACT_OUTCOME_LABELS: Record<ContactOutcome, string> = {
  reached: 'Reached',
  no_answer: 'No answer',
  left_message: 'Left message',
  scheduled_callback: 'Scheduled callback',
  wrong_contact: 'Wrong contact',
};

export const PRIORITY_COLORS: Record<FollowUpPriority, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const STATUS_COLORS: Record<FollowUpStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export const followUpTargetName = (fu: Pick<FollowUp, 'person' | 'user'>): string => {
  const p = fu.person;
  const u = fu.user;
  if (p) return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown';
  if (u) {
    const fn = (u.first_name || '') + (u.last_name ? ' ' + u.last_name : '');
    return fn.trim() || u.full_name || u.email || 'Unknown';
  }
  return 'Unknown';
};

export const followUpTargetIsMember = (fu: Pick<FollowUp, 'user_id'>): boolean => Boolean(fu.user_id);

export const isOverdue = (fu: Pick<FollowUp, 'status' | 'scheduled_date'>): boolean => {
  if (!fu.scheduled_date) return false;
  if (fu.status !== 'pending' && fu.status !== 'in_progress') return false;
  return new Date(fu.scheduled_date).getTime() < new Date(new Date().toDateString()).getTime();
};
