import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Users,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Church,
} from 'lucide-react';
import {
  getChurchMembers,
  getUsers,
  registerUser,
  addMemberToChurch,
  removeMemberFromChurch,
  type User,
} from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';

const ChurchMemberManagement: React.FC = () => {
  const { user } = useAuth();
  const { currentChurch, effectiveRole } = useChurch();
  const [members, setMembers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'member' as 'admin' | 'member',
  });
  const [error, setError] = useState('');

  const loadMembers = () => {
    if (currentChurch) {
      setMembers(getChurchMembers(currentChurch.id));
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentChurch]);

  const handleAddMember = () => {
    setError('');
    if (!newMember.firstName || !newMember.lastName || !newMember.email) {
      setError('Please fill all required fields');
      return;
    }
    if (!currentChurch || !user) return;

    // Try to register user first (or find existing)
    const result = registerUser(
      {
        email: newMember.email,
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        phone: newMember.phone,
        role: newMember.role,
      },
      user.id
    );

    if (result.success && result.user) {
      addMemberToChurch(result.user.id, currentChurch.id, undefined, newMember.role);
    } else if (result.message === 'User with this email already exists') {
      // User exists, try to add them to this church
      const allUsers = getUsers();
      const existingUser = allUsers.find((u: User) => u.email === newMember.email);
      if (existingUser) {
        const added = addMemberToChurch(existingUser.id, currentChurch.id, undefined, newMember.role);
        if (!added) {
          setError('This person is already a member of this church');
          return;
        }
      }
    } else {
      setError(result.message);
      return;
    }

    setNewMember({ firstName: '', lastName: '', email: '', phone: '', role: 'member' });
    setIsAddOpen(false);
    loadMembers();
  };

  const handleRemoveMember = (memberId: string) => {
    if (!currentChurch) return;
    if (memberId === user?.id) {
      alert('You cannot remove yourself from the church.');
      return;
    }
    if (confirm('Remove this member from the church?')) {
      removeMemberFromChurch(memberId, currentChurch.id);
      loadMembers();
    }
  };

  const filtered = members.filter(m =>
    `${m.firstName} ${m.lastName} ${m.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const canManage = effectiveRole === 'admin' || effectiveRole === 'super_admin';

  if (!currentChurch) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Please select a church first.</p>
      </div>
    );
  }

  const adminCount = members.filter(m =>
    (m.churchMemberships || []).some(
      cm => cm.churchId === currentChurch.id && cm.role === 'admin'
    )
  ).length;
  const memberCount = members.length - adminCount;

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Members</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage members of {currentChurch.name}
          </p>
        </div>

        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member to {currentChurch.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="memberFirst">First Name *</Label>
                    <Input
                      id="memberFirst"
                      placeholder="John"
                      value={newMember.firstName}
                      onChange={e => setNewMember(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="memberLast">Last Name *</Label>
                    <Input
                      id="memberLast"
                      placeholder="Doe"
                      value={newMember.lastName}
                      onChange={e => setNewMember(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="memberEmail">Email *</Label>
                  <Input
                    id="memberEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={newMember.email}
                    onChange={e => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="memberPhone">Phone</Label>
                  <Input
                    id="memberPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={newMember.phone}
                    onChange={e => setNewMember(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="memberRole">Role in Church</Label>
                  <select
                    id="memberRole"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={newMember.role}
                    onChange={e => setNewMember(prev => ({ ...prev, role: e.target.value as 'admin' | 'member' }))}
                  >
                    <option value="member">Member</option>
                    {effectiveRole === 'super_admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
                <Button onClick={handleAddMember} className="w-full">
                  Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-gray-500">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{adminCount}</p>
              <p className="text-xs text-gray-500">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Church className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-xs text-gray-500">Regular Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-10"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No members found</p>
              <p className="text-sm">Add members to your church to get started</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(member => {
            const membership = (member.churchMemberships || []).find(
              m => m.churchId === currentChurch.id
            );
            const roleInChurch = membership?.role || 'member';

            return (
              <Card key={member.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-600">
                          {member.firstName[0]}{member.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <Badge
                            variant={roleInChurch === 'admin' ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {roleInChurch}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {member.email}
                          </span>
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {member.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManage && member.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChurchMemberManagement;
