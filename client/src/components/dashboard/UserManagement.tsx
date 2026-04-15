import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Trash2, Crown, Shield, User, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import AddMemberDialog from './AddMemberDialog';
import { createMemberApi, fetchUsers, deleteUserById } from '@/lib/api';

type UserType = {
  id: string;
  full_name?: string;
  email: string;
  role: string;
  is_active?: boolean;
  createdAt?: string;
};

export const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { currentBranch, currentChurch } = useChurch();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user, currentBranch?.id]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetchUsers();
      setUsers(res.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    try {
      await deleteUserById(targetUserId);
      setMessage('User deleted successfully');
      setMessageType('success');
      loadUsers();
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete user');
      setMessageType('error');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateSuccess = () => {
    setMessage('User created successfully');
    setMessageType('success');
    setIsCreateDialogOpen(false);
    loadUsers();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateUser = async (data: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role: string;
  }) => {
    if (!getCreatableRoles().includes(data.role as 'admin' | 'member')) {
      setMessage('You are not allowed to create a user with that role');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return false;
    }

    setIsCreatingUser(true);
    try {
      await createMemberApi({
        ...data,
        branch_name: currentBranch?.name,
        church_name: currentChurch?.denomination_name,
      });
      handleCreateSuccess();
      return true;
    } catch (err: any) {
      setMessage(err.message || 'Failed to create user');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return false;
    } finally {
      setIsCreatingUser(false);
    }
  };

  const getRoleIcon = (role: UserType['role']) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'member':
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: UserType['role']) => {
    switch (role) {
      case 'super_admin':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCreatableRoles = (): Array<'admin' | 'member'> => {
    if (!user) return [];
    const roleName = user.role?.name || '';
    if (roleName === 'super_admin') {
      return ['admin', 'member'];
    } else if (roleName === 'admin') {
      return ['member'];
    }
    
    return [];
  };

  const canCreateUsers = user && getCreatableRoles().length > 0;
  const canDeleteUser = (targetUser: UserType) => {
    if (!user) return false;
    const roleName = user.role?.name || '';
    return roleName === 'super_admin' || (roleName === 'admin' && targetUser.role === 'member');
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage church members and their roles
              </CardDescription>
            </div>
            
            {canCreateUsers && (
              <>
                <Button className="flex items-center gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
                <AddMemberDialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                  onSave={handleCreateUser}
                  saving={isCreatingUser}
                  branchName={currentBranch?.name}
                  churchName={currentChurch?.denomination_name}
                  allowedRoles={getCreatableRoles()}
                />
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.role === 'super_admin').length}
              </div>
              <div className="text-sm text-yellow-600">Super Admins</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <div className="text-sm text-red-600">Church Admins</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'member').length}
              </div>
              <div className="text-sm text-blue-600">Members</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage all church members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((userItem) => (
              <div
                key={userItem.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(userItem.role as any)}
                    <div>
                      <div className="font-semibold">
                        {userItem.full_name || userItem.email}
                        {userItem.id === user.id && (
                          <span className="text-sm text-muted-foreground ml-2">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{userItem.email}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(userItem.role as any)}>
                    {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                  </Badge>
                  
                  <div className="text-sm text-muted-foreground">
                    {userItem.createdAt ? `Joined ${new Date(userItem.createdAt).toLocaleDateString()}` : ''}
                  </div>
                  
                  {canDeleteUser(userItem) && userItem.id !== user.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(userItem.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};