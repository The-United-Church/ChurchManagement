import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Phone, Calendar, Heart, MapPin } from 'lucide-react';

// Mock member directory data
const members = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    birthdate: '1980-05-15',
    maritalStatus: 'Married',
    address: '123 Oak Street, Springfield, IL 62701',
    profilePicture: '',
    role: 'Member'
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 234-5678',
    birthdate: '1985-08-22',
    maritalStatus: 'Single',
    address: '456 Pine Avenue, Springfield, IL 62702',
    profilePicture: '',
    role: 'Member'
  },
  {
    id: 3,
    name: 'Michael Brown',
    email: 'michael.brown@email.com',
    phone: '+1 (555) 345-6789',
    birthdate: '1975-12-10',
    maritalStatus: 'Married',
    address: '789 Elm Street, Springfield, IL 62703',
    profilePicture: '',
    role: 'Admin'
  },
  {
    id: 4,
    name: 'Emily Davis',
    email: 'emily.davis@email.com',
    phone: '+1 (555) 456-7890',
    birthdate: '1990-03-18',
    maritalStatus: 'Single',
    address: '321 Maple Drive, Springfield, IL 62704',
    profilePicture: '',
    role: 'Member'
  },
  {
    id: 5,
    name: 'David Wilson',
    email: 'david.wilson@email.com',
    phone: '+1 (555) 567-8901',
    birthdate: '1982-07-25',
    maritalStatus: 'Married',
    address: '654 Cedar Lane, Springfield, IL 62705',
    profilePicture: '',
    role: 'Member'
  },
  {
    id: 6,
    name: 'Lisa Anderson',
    email: 'lisa.anderson@email.com',
    phone: '+1 (555) 678-9012',
    birthdate: '1988-11-30',
    maritalStatus: 'Divorced',
    address: '987 Birch Road, Springfield, IL 62706',
    profilePicture: '',
    role: 'Member'
  }
];

const MemberDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800';
      case 'Owner':
        return 'bg-yellow-100 text-yellow-800';
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
            Connect with fellow church members
          </p>
        </div>
        <Badge variant="secondary" className="text-xs md:text-sm self-start sm:self-auto">
          {filteredMembers.length} Members
        </Badge>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => (
          <Dialog key={member.id}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.profilePicture} />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{member.name}</h3>
                        <Badge className={`text-xs ${getRoleColor(member.role)}`}>
                          {member.role}
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
                  Contact information and details for {member.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={member.profilePicture} />
                    <AvatarFallback className="text-lg">{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{member.name}</h3>
                    <Badge className={`text-xs ${getRoleColor(member.role)}`}>
                      {member.role}
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
                      <p className="text-sm text-gray-600">{member.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Birth Date</p>
                      <p className="text-sm text-gray-600">{member.birthdate}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Marital Status</p>
                      <p className="text-sm text-gray-600">{member.maritalStatus}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-gray-600">{member.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      {filteredMembers.length === 0 && (
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