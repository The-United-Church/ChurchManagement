import type { ChurchMembership } from '@/types/church';
import { createChurch, createBranch, updateChurch } from '@/lib/church';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'member'; // effective role (derived from context)
  systemRole?: 'super_admin'; // platform-level role (only for devs)
  churchMemberships: ChurchMembership[]; // per-church roles
  joinDate: string;
  attendance: AttendanceRecord[];
  createdBy?: string;
}

export interface AttendanceRecord {
  id: string;
  serviceType: string;
  date: string;
  present: boolean;
}

export interface Service {
  id: string;
  name: string;
  type: 'sunday-service' | 'bible-study' | 'prayer-meeting' | 'special-event';
  date: string;
  time: string;
}

const USERS_KEY = 'church_users';
const CURRENT_USER_KEY = 'church_current_user';
const SERVICES_KEY = 'church_services';

// Role hierarchy for permissions
export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  member: 2,
};

export const ROLE_PERMISSIONS = {
  super_admin: ['manage_churches', 'create_admin', 'manage_all_users', 'delete_users', 'view_all_data'],
  admin: ['manage_church', 'create_member', 'manage_members', 'view_attendance', 'manage_branches'],
  member: ['mark_attendance', 'view_own_profile', 'participate_services'],
};

// Initialize with super admin account if none exists
const initializeSuperAdmin = () => {
  const users = getUsers();
  if (users.length === 0) {
    const superAdmin: User = {
      id: 'super-admin-1',
      email: 'admin@platform.com',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'super_admin',
      systemRole: 'super_admin',
      churchMemberships: [],
      joinDate: new Date().toISOString(),
      attendance: []
    };
    users.push(superAdmin);
    saveUsers(users);
  }
};

// Initialize mock services
const initializeServices = () => {
  const existingServices = localStorage.getItem(SERVICES_KEY);
  if (!existingServices) {
    const mockServices: Service[] = [
      {
        id: '1',
        name: 'Sunday Morning Service',
        type: 'sunday-service',
        date: '2025-01-12',
        time: '10:00 AM'
      },
      {
        id: '2',
        name: 'Wednesday Bible Study',
        type: 'bible-study',
        date: '2025-01-15',
        time: '7:00 PM'
      },
      {
        id: '3',
        name: 'Friday Prayer Meeting',
        type: 'prayer-meeting',
        date: '2025-01-17',
        time: '6:30 PM'
      }
    ];
    localStorage.setItem(SERVICES_KEY, JSON.stringify(mockServices));
  }
};

export const getUsers = (): User[] => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const canCreateRole = (creatorRole: User['role'], targetRole: User['role']): boolean => {
  if (creatorRole === 'super_admin') return true;
  if (creatorRole === 'admin' && targetRole === 'member') return true;
  return false;
};

export const canManageUser = (managerRole: User['role'], targetRole: User['role']): boolean => {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
};

export const registerUser = (
  userData: Omit<User, 'id' | 'joinDate' | 'attendance' | 'churchMemberships'> & { churchMemberships?: ChurchMembership[] },
  createdBy?: string
): { success: boolean; message: string; user?: User } => {
  initializeSuperAdmin();
  const users = getUsers();
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === userData.email);
  if (existingUser) {
    return { success: false, message: 'User with this email already exists' };
  }

  // Validate role creation permissions if createdBy is provided
  if (createdBy) {
    const creator = users.find(u => u.id === createdBy);
    if (!creator) {
      return { success: false, message: 'Creator not found' };
    }
    
    if (!canCreateRole(creator.role, userData.role)) {
      return { success: false, message: `${creator.role} cannot create ${userData.role} accounts` };
    }
  }

  const newUser: User = {
    ...userData,
    id: Date.now().toString(),
    joinDate: new Date().toISOString(),
    attendance: [],
    churchMemberships: userData.churchMemberships || [],
    createdBy
  };

  users.push(newUser);
  saveUsers(users);
  
  return { success: true, message: 'Registration successful', user: newUser };
};

export const loginUser = (email: string, password: string): { success: boolean; message: string; user?: User } => {
  initializeSuperAdmin();
  const users = getUsers();
  
  // For MVP, we'll use a simple password check (in real app, use proper hashing)
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // For MVP, any password works (in real app, verify hashed password)
  return { success: true, message: 'Login successful', user };
};

export const logoutUser = () => {
  setCurrentUser(null);
};

export const getServices = (): Service[] => {
  initializeServices();
  const services = localStorage.getItem(SERVICES_KEY);
  return services ? JSON.parse(services) : [];
};

export const markAttendance = (userId: string, serviceId: string, present: boolean): boolean => {
  const users = getUsers();
  const services = getServices();
  
  const userIndex = users.findIndex(u => u.id === userId);
  const service = services.find(s => s.id === serviceId);
  
  if (userIndex === -1 || !service) {
    return false;
  }

  const attendanceRecord: AttendanceRecord = {
    id: Date.now().toString(),
    serviceType: service.name,
    date: service.date,
    present
  };

  // Remove existing attendance for this service if any
  users[userIndex].attendance = users[userIndex].attendance.filter(
    a => !(a.serviceType === service.name && a.date === service.date)
  );

  users[userIndex].attendance.push(attendanceRecord);
  saveUsers(users);

  // Update current user if it's the same user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(users[userIndex]);
  }

  return true;
};

export const getAllUsers = (requesterId: string): User[] => {
  const users = getUsers();
  const requester = users.find(u => u.id === requesterId);
  
  if (!requester) return [];
  
  // Super admin can see all users
  if (requester.systemRole === 'super_admin') return users;
  
  // Admin can see members of their churches
  if (requester.role === 'admin') {
    const adminChurchIds = (requester.churchMemberships || [])
      .filter(m => m.role === 'admin')
      .map(m => m.churchId);
    return users.filter(u => 
      u.id === requesterId ||
      u.createdBy === requesterId ||
      (u.churchMemberships || []).some(m => adminChurchIds.includes(m.churchId))
    );
  }
  
  // Members can only see themselves
  return users.filter(u => u.id === requesterId);
};

export const deleteUser = (deleterId: string, targetUserId: string): { success: boolean; message: string } => {
  const users = getUsers();
  const deleter = users.find(u => u.id === deleterId);
  const target = users.find(u => u.id === targetUserId);
  
  if (!deleter || !target) {
    return { success: false, message: 'User not found' };
  }
  
  if (!canManageUser(deleter.role, target.role)) {
    return { success: false, message: 'Insufficient permissions to delete this user' };
  }
  
  const updatedUsers = users.filter(u => u.id !== targetUserId);
  saveUsers(updatedUsers);
  
  return { success: true, message: 'User deleted successfully' };
};

// Register a new church with an admin account
export const registerChurchWithAdmin = (
  churchData: { name: string; description?: string },
  adminData: { email: string; firstName: string; lastName: string; phone?: string; password?: string }
): { success: boolean; message: string; user?: User; churchId?: string } => {
  initializeSuperAdmin();
  const users = getUsers();

  // Check if email already exists
  const existing = users.find(u => u.email === adminData.email);
  if (existing) {
    return { success: false, message: 'An account with this email already exists' };
  }

  // Create the church
  const church = createChurch({
    name: churchData.name,
    description: churchData.description,
    createdBy: '',
  });

  // Create default HQ branch
  createBranch({
    churchId: church.id,
    name: 'Main Branch',
    isHeadquarters: true,
  });

  // Create admin user
  const adminUser: User = {
    id: Date.now().toString(),
    email: adminData.email,
    firstName: adminData.firstName,
    lastName: adminData.lastName,
    phone: adminData.phone,
    role: 'admin',
    churchMemberships: [{ churchId: church.id, role: 'admin' }],
    joinDate: new Date().toISOString(),
    attendance: [],
  };

  users.push(adminUser);
  saveUsers(users);

  // Update church createdBy
  updateChurch(church.id, { createdBy: adminUser.id } as any);

  return { success: true, message: 'Church registered successfully', user: adminUser, churchId: church.id };
};

// Add a member to a church
export const addMemberToChurch = (
  userId: string,
  churchId: string,
  branchId?: string,
  role: 'admin' | 'member' = 'member'
): boolean => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;

  const memberships = users[idx].churchMemberships || [];
  // Check if already a member
  if (memberships.some(m => m.churchId === churchId)) return false;

  memberships.push({ churchId, branchId, role });
  users[idx].churchMemberships = memberships;

  // Update effective role if this is a higher role
  if (role === 'admin' && users[idx].role === 'member') {
    users[idx].role = 'admin';
  }

  saveUsers(users);

  // Update current user if same
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(users[idx]);
  }

  return true;
};

// Remove a member from a church
export const removeMemberFromChurch = (
  userId: string,
  churchId: string
): boolean => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;

  users[idx].churchMemberships = (users[idx].churchMemberships || []).filter(
    m => m.churchId !== churchId
  );

  // Recalculate effective role
  const hasAdmin = users[idx].churchMemberships.some(m => m.role === 'admin');
  users[idx].role = hasAdmin ? 'admin' : 'member';

  saveUsers(users);

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(users[idx]);
  }

  return true;
};

// Get members of a specific church
export const getChurchMembers = (churchId: string): User[] => {
  const users = getUsers();
  return users.filter(u =>
    (u.churchMemberships || []).some(m => m.churchId === churchId)
  );
};