import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Trash2, Crown, Shield, User, UserCheck } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { getAllUsers, deleteUser, canCreateRole } from '@/lib/auth';

// Define UserType if not already imported
type UserType = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'super_admin' | 'admin' | 'member';
  systemRole?: 'super_admin';
  joinDate: string;
};

export const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = () => {
    if (!user) return;
    const allUsers = getAllUsers(user.id);
    setUsers(allUsers);
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!user) return;
    
    const result = deleteUser(user.id, targetUserId);
    
    if (result.success) {
      setMessage('User deleted successfully');
      setMessageType('success');
      loadUsers();
    } else {
      setMessage(result.message);
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
    
    if (user.systemRole === 'super_admin') {
      return ['admin', 'member'];
    } else if (user.role === 'admin') {
      return ['member'];
    }
    
    return [];
  };

  const canCreateUsers = user && getCreatableRoles().length > 0;
  const canDeleteUser = (targetUser: UserType) => {
    if (!user) return false;
    return user.systemRole === 'super_admin' || (user.role === 'admin' && targetUser.role === 'member');
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
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new member to your church community
                    </DialogDescription>
                  </DialogHeader>
                  <RegisterForm
                    onSwitchToLogin={() => {}}
                    createdBy={user.id}
                    allowedRoles={getCreatableRoles()}
                    onSuccess={handleCreateSuccess}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.systemRole === 'super_admin').length}
              </div>
              <div className="text-sm text-yellow-600">Super Admins</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'admin' && !u.systemRole).length}
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
                    {getRoleIcon(userItem.role)}
                    <div>
                      <div className="font-semibold">
                        {userItem.firstName} {userItem.lastName}
                        {userItem.id === user.id && (
                          <span className="text-sm text-muted-foreground ml-2">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{userItem.email}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(userItem.role)}>
                    {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                  </Badge>
                  
                  <div className="text-sm text-muted-foreground">
                    Joined {new Date(userItem.joinDate).toLocaleDateString()}
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
            
            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};