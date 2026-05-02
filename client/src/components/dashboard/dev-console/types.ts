export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  user?: { email: string; full_name?: string };
  createdAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  onlineUsers?: number;
  mostActiveUser?: {
    id: string;
    email: string;
    full_name?: string;
    total_time_spent_seconds: number;
  } | null;
  usersByRole: { role: string; count: number }[];
}

export interface DisplayUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  joinDate: string;
  lastAccess?: string;
  isOnline?: boolean;
  currentSessionStartedAt?: string | null;
  totalTimeSpentSeconds?: number;
  totalTimeSpentMinutes?: number;
}

export interface RoleInfo {
  id: string;
  name: string;
  permissions?: { id: string; name: string }[];
}

export interface HealthInfo {
  status: string;
  timestamp: string;
}

export interface BackendUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role?: { name: string } | string;
  is_active: boolean;
  createdAt?: string;
  phone_number?: string;
  last_access?: string;
  current_session_started_at?: string | null;
  total_time_spent_seconds?: number;
  total_time_spent_minutes?: number;
  is_online?: boolean;
}

export interface WebsiteVisitStats {
  totalVisits: number;
  todayVisits: number;
  mainLandingVisits: number;
  customDomainVisits: number;
  uniqueVisitors: number;
  lastVisitAt: string | null;
  lastVisitDomain: string | null;
  topDomains: { domain: string; count: number }[];
  daily: { date: string; count: number }[];
}

export interface PendingCounts {
  denominationRequests: number;
  customDomains: number;
}
