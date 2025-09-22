import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Heart, 
  Edit, 
  Shield, 
  UserPlus,
  Camera
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const MemberProfile: React.FC = () => {
  const { user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState('');

  // Mock user profile data
  const profileData = {
    fullName: `${user?.firstName} ${user?.lastName}`,
    profilePicture: '', // Empty for now
    birthdate: '1985-06-15',
    gender: 'Male',
    maritalStatus: 'Married',
    mobilePhone: '+1 (555) 123-4567',
    email: user?.email || '',
    address: '123 Main Street',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701'
  };

  const familyMembers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      relationship: 'Spouse',
      birthdate: '1987-03-22',
      phone: '+1 (555) 123-4568'
    },
    {
      id: 2,
      name: 'Emily Johnson',
      relationship: 'Child',
      birthdate: '2010-09-12',
      phone: ''
    },
    {
      id: 3,
      name: 'Michael Johnson',
      relationship: 'Child',
      birthdate: '2012-11-08',
      phone: ''
    }
  ];

  const relationshipOptions = [
    'Grandparent',
    'Parent',
    'Spouse',
    'Child',
    'Sibling',
    'Other'
  ];

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage your personal information and family details
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your basic profile information</CardDescription>
                </div>
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Update your personal information here.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                      <div className="grid gap-4 py-4">
                        {/* Name Fields - 2 columns on larger screens */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" defaultValue={user?.firstName} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" defaultValue={user?.lastName} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="middleName">Middle Name</Label>
                            <Input id="middleName" placeholder="Optional" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="nickName">Nick Name</Label>
                            <Input id="nickName" placeholder="Optional" />
                          </div>
                        </div>

                        {/* Personal Info - 2 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="birthdate">Birth Date</Label>
                            <Input id="birthdate" type="date" defaultValue={profileData.birthdate} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select defaultValue={profileData.gender}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Address - Full width then 2 columns */}
                        <div className="grid gap-2">
                          <Label htmlFor="address">Address</Label>
                          <Input id="address" defaultValue={profileData.address} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" defaultValue={profileData.city} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="state">State</Label>
                            <Input id="state" defaultValue={profileData.state} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="postalCode">Postal Code</Label>
                            <Input id="postalCode" defaultValue={profileData.postalCode} />
                          </div>
                        </div>

                        {/* Contact & Status - 2 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="phone">Mobile Phone</Label>
                            <Input id="phone" defaultValue={profileData.mobilePhone} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="maritalStatus">Marital Status</Label>
                            <Select defaultValue={profileData.maritalStatus}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Single">Single</SelectItem>
                                <SelectItem value="Married">Married</SelectItem>
                                <SelectItem value="Divorced">Divorced</SelectItem>
                                <SelectItem value="Widowed">Widowed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-20 w-20 md:h-24 md:w-24">
                    <AvatarImage src={profileData.profilePicture} />
                    <AvatarFallback className="text-lg">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm" className="text-xs md:text-sm">
                    <Camera className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    Change Photo
                  </Button>
                </div>
                
                <div className="flex-1 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Full Name</p>
                      <p className="text-sm text-gray-600 truncate">{profileData.fullName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Birth Date</p>
                      <p className="text-sm text-gray-600 truncate">{profileData.birthdate}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Gender</p>
                      <p className="text-sm text-gray-600 truncate">{profileData.gender}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Marital Status</p>
                      <p className="text-sm text-gray-600 truncate">{profileData.maritalStatus}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Mobile Phone</p>
                      <p className="text-sm text-gray-600 truncate">{profileData.mobilePhone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-gray-600 truncate">{profileData.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-gray-600 break-words">
                        {profileData.address}, {profileData.city}, {profileData.state} {profileData.postalCode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">Currently disabled</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Family Members</CardTitle>
                  <CardDescription>Manage your family member information</CardDescription>
                </div>
                <Dialog open={familyDialogOpen} onOpenChange={setFamilyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Family Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Add Family Member</DialogTitle>
                      <DialogDescription>
                        Add a new family member to your profile.
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="relationship">Relationship</Label>
                          <Select value={selectedRelationship} onValueChange={setSelectedRelationship}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              {relationshipOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedRelationship && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="familyFirstName">First Name</Label>
                                <Input id="familyFirstName" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="familyLastName">Last Name</Label>
                                <Input id="familyLastName" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="familyMiddleName">Middle Name</Label>
                                <Input id="familyMiddleName" placeholder="Optional" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="familyNickName">Nick Name</Label>
                                <Input id="familyNickName" placeholder="Optional" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="familyBirthdate">Birth Date</Label>
                                <Input id="familyBirthdate" type="date" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="familyGender">Gender</Label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="grid gap-2">
                              <Label htmlFor="familyAddress">Address</Label>
                              <Input id="familyAddress" placeholder="Optional" />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="familyCity">City</Label>
                                <Input id="familyCity" placeholder="Optional" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="familyState">State</Label>
                                <Input id="familyState" placeholder="Optional" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="familyPostalCode">Postal Code</Label>
                                <Input id="familyPostalCode" placeholder="Optional" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="familyPhone">Mobile Phone</Label>
                                <Input id="familyPhone" placeholder="Optional" />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="familyMaritalStatus">Marital Status</Label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Single">Single</SelectItem>
                                    <SelectItem value="Married">Married</SelectItem>
                                    <SelectItem value="Divorced">Divorced</SelectItem>
                                    <SelectItem value="Widowed">Widowed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setFamilyDialogOpen(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button onClick={() => setFamilyDialogOpen(false)} className="w-full sm:w-auto">
                        Add Family Member
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{member.name}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                          <Badge variant="secondary" className="w-fit">{member.relationship}</Badge>
                          <span className="truncate">{member.birthdate}</span>
                          {member.phone && <span className="truncate">{member.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemberProfile;