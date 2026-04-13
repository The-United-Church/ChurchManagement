export const EventCategory = {
  CHURCH_SERVICE: "church_service",
  MIDWEEK_SERVICE: "midweek_service",
  YOUTH: "youth",
  WOMEN: "women",
  MEN: "men",
  CHILDREN: "children",
  REVIVAL: "revival",
  GENERAL: "general",
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.CHURCH_SERVICE]: "Church Service",
  [EventCategory.MIDWEEK_SERVICE]: "Midweek Service",
  [EventCategory.YOUTH]: "Youth",
  [EventCategory.WOMEN]: "Women",
  [EventCategory.MEN]: "Men",
  [EventCategory.CHILDREN]: "Children",
  [EventCategory.REVIVAL]: "Revival",
  [EventCategory.GENERAL]: "General",
};

export const RecurrencePattern = {
  DAILY: "daily",
  WEEKLY: "weekly",
  EVERY_2_WEEKS: "every_2_weeks",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
} as const;
export type RecurrencePattern = (typeof RecurrencePattern)[keyof typeof RecurrencePattern];

export const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
  [RecurrencePattern.DAILY]: "Daily",
  [RecurrencePattern.WEEKLY]: "Weekly",
  [RecurrencePattern.EVERY_2_WEEKS]: "Every 2 Weeks",
  [RecurrencePattern.MONTHLY]: "Monthly",
  [RecurrencePattern.QUARTERLY]: "Quarterly",
  [RecurrencePattern.YEARLY]: "Yearly",
};

export const MonthlyRecurrenceType = {
  DAY_OF_MONTH: "day_of_month",
  DAY_OF_WEEK: "day_of_week",
} as const;
export type MonthlyRecurrenceType = (typeof MonthlyRecurrenceType)[keyof typeof MonthlyRecurrenceType];

export const EventVisibility = {
  PUBLIC: "public",
  MEMBERS: "members",
} as const;
export type EventVisibility = (typeof EventVisibility)[keyof typeof EventVisibility];

export const EventStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  CLOSED: "closed",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.DRAFT]: "Draft",
  [EventStatus.PUBLISHED]: "Published",
  [EventStatus.CANCELLED]: "Cancelled",
  [EventStatus.CLOSED]: "Closed",
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface EventDTO {
  id: string;
  title: string;
  description: string | null;
  location: string;
  category: EventCategory;
  date: string;
  time_from: string;
  time_to: string;
  image: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_days: number[] | null;
  monthly_type: MonthlyRecurrenceType | null;
  monthly_day: number | null;
  monthly_week_descriptor: string | null;
  recurrence_end_date: string | null;
  accept_attendance: boolean;
  require_location: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_radius: number | null;
  /** "open" | "closed" | "scheduled" | null (null = always open) */
  attendance_status: "open" | "closed" | "scheduled" | null;
  /** ISO datetime string – used when attendance_status = "scheduled" */
  attendance_opens_at: string | null;
  /** ISO datetime string – used when attendance_status = "scheduled" */
  attendance_closes_at: string | null;
  visibility: EventVisibility;
  visible_to_member_ids: string[] | null;
  publish_at: string | null;
  is_published: boolean;
  status: EventStatus;
  branch_id: string;
  created_by: string;
  creator?: { id: string; email: string; full_name?: string };
  created_at: string;
  updated_at: string;
}

export type CreateEventInput = Omit<
  EventDTO,
  "id" | "is_published" | "branch_id" | "created_by" | "creator" | "created_at" | "updated_at"
>;

export type UpdateEventInput = Partial<CreateEventInput>;

export interface EventAttendanceDTO {
  id: string;
  event_id: string;
  event_date: string;
  user_id: string;
  user?: { id: string; email: string; full_name?: string; first_name?: string; last_name?: string };
  marked_by: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  checked_in_at: string;
}

export interface AttendanceSummaryItem {
  date: string;
  count: number;
}
