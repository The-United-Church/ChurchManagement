import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Phone, Shield, Loader2 } from 'lucide-react';
import { useMemberCrud } from '@/hooks/useMemberCrud';
import { useChurch } from '@/components/church/ChurchProvider';
import type { MemberDTO } from '@/lib/api';

const MemberDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { currentBranch } = useChurch();
  const { members, loading, load } = useMemberCrud();

  useEffect(() => {
    if (!currentBranch?.id) return;
    load();
  }, [currentBranch?.id, load]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;

    return members.filter((member) => {
      const name = getDisplayName(member).toLowerCase();
      return name.includes(q) || member.email.toLowerCase().includes(q);
    });
  }, [members, searchTerm]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  function getDisplayName(member: MemberDTO) {
    const full = member.full_name?.trim();
    if (full) return full;

    const first = member.first_name?.trim() || '';
    const last = member.last_name?.trim() || '';
    const combined = `${first} ${last}`.trim();
    return combined || member.email;
  }

  const getProfileImage = (member: MemberDTO) =>
    member.profile_img || member.profile_image || '';

  const getRoleColor = (role: string) => {
    const normalized = role.toLowerCase();
    switch (normalized) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'super_admin':
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'coordinator':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Member Directory</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Members in the selected branch
          </p>
        </div>
        <Badge variant="secondary" className="text-xs md:text-sm self-start sm:self-auto">
          {filteredMembers.length} Members
        </Badge>
      </div>

      {!currentBranch && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Select a branch to view members.</p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className={!currentBranch ? 'opacity-60 pointer-events-none' : ''}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={!currentBranch}
            />
          </div>
        </CardContent>
      </Card>

      {loading && currentBranch && (
        <Card>
          <CardContent className="p-8 text-center flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members...
          </CardContent>
        </Card>
      )}

      {/* Members Grid */}
      {!loading && currentBranch && (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => {
          const displayName = getDisplayName(member);
          const displayRole = member.branch_role || member.role || 'member';
          return (
          <Dialog key={member.id}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getProfileImage(member)} />
                      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                        <Badge className={`text-xs ${getRoleColor(displayRole)}`}>
                          {displayRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{member.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Member Details</DialogTitle>
                <DialogDescription>
                  Contact information for {displayName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={getProfileImage(member)} />
                    <AvatarFallback className="text-lg">{getInitials(displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{displayName}</h3>
                    <Badge className={`text-xs ${getRoleColor(displayRole)}`}>
                      {displayRole}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-gray-600">{member.phone_number || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Branch Status</p>
                      <p className="text-sm text-gray-600">
                        {member.branch_is_active === false ? 'Inactive' : 'Active'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );})}
      </div>
      )}

      {!loading && currentBranch && filteredMembers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No members found matching your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MemberDirectory;