import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Church, Users, Calendar, Shield, Crown, Settings, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AttendanceTracker } from './AttendanceTracker';
import { MemberProfile } from './MemberProfile';
import { UserManagement } from './UserManagement';
import AdminDashboard from './AdminDashboard';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    logout();
  };

  if (!user) return null;

  const getRoleIcon = () => {
    switch (user.role) {
      case 'owner':
        return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-5 w-5 text-red-600" />;
      default:
        return <Church className="h-5 w-5 text-blue-600" />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'owner':
        return 'text-yellow-600';
      case 'admin':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const canManageUsers = user.role === 'owner' || user.role === 'admin';
  const canViewAnalytics = user.role === 'owner' || user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {getRoleIcon()}
              <div>
                <h1 className="text-xl font-bold text-gray-900">Church Management</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user.firstName}! 
                  <span className={`ml-1 font-medium ${getRoleColor()}`}>
                    ({user.role.charAt(0).toUpperCase() + user.role.slice(1)})
                  </span>
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card - Only show for non-admin/owner roles */}
        {!canViewAnalytics && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">
                Welcome to Your Church Dashboard
              </CardTitle>
              <CardDescription>
                {user.role === 'member' && 'As a church member, you can track your attendance and participate in church activities.'}
                {user.role === 'user' && 'Welcome to our church community! Track your attendance and stay connected.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-900">Track Attendance</div>
                    <div className="text-sm text-blue-700">Mark your presence at services</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-900">Member Profile</div>
                    <div className="text-sm text-green-700">View your membership details</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${canViewAnalytics ? (canManageUsers ? 'grid-cols-4' : 'grid-cols-3') : 'grid-cols-2'}`}>
            {canViewAnalytics && (
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            )}
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Profile
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Management
              </TabsTrigger>
            )}
          </TabsList>
          
          {canViewAnalytics && (
            <TabsContent value="dashboard">
              <AdminDashboard />
            </TabsContent>
          )}
          
          <TabsContent value="attendance">
            <AttendanceTracker />
          </TabsContent>
          
          <TabsContent value="profile">
            <MemberProfile />
          </TabsContent>
          
          {canManageUsers && (
            <TabsContent value="management">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;