export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export interface SecuritySettings {
  '2fa': boolean;
  loginAlerts: boolean;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  communityUpdates: boolean;
  directMessages: boolean;
  mentions: boolean;
  weeklyDIgest: boolean;
}

export interface PrivacySettings {
  isProfileVisible: 'public' | 'private';
  showEmail: boolean;
  showPhoneNumber: boolean;
  showFamilyMembers: boolean;
  showLocation: boolean;
  showBirthYear: boolean;
  showMaritalStatus: boolean;
  showSocialLinks: boolean;
  showWork: boolean;
  showMembership: boolean;
  showActivityStatus: boolean;
  allowDirectMessage: boolean;
  showOnlineStatus: boolean;
}

export interface UserSettings {
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  currency?: string;
}

export enum UserRole {
  ADMIN = "admin",
  VIEWER = "viewer",
  OPERATOR = "operator",
  MANAGER = "manager",
  USER = "user",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive"
}