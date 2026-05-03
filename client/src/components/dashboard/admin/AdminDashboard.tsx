import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Heart, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Home,
  Gift,
  CalendarDays,
  Target
} from 'lucide-react';
import { useFollowUpStats } from '@/hooks/useFollowUpsCrud';

// Mock data - replace with backend API data when endpoints are available
const mockData = {
  totalMembers: 0,
  totalFamilies: 0,
  totalUsers: 0,
  totalGroups: 0,
  newMembersThisMonth: 0,
  birthdaysToday: 0,
  anniversariesToday: 0,
  pendingFollowUps: 0,
  pendingFollowUpsThisMonth: 0,
  doneFollowUps: 0,
  totalEvents: 0,
  contributionsLastWeek: 0,
  upcomingEvents: [] as { id: number; name: string; date: string; time: string; attendees: number }[],
  attendanceLast30Days: [] as { date: string; count: number }[],
};

const AdminDashboard: React.FC = () => {
  const { data: followUpStats } = useFollowUpStats();
  const fuPending = followUpStats?.pending ?? 0;
  const fuPendingThisMonth = followUpStats?.pendingThisMonth ?? 0;
  const fuDone = followUpStats?.completed ?? 0;

  const averageAttendance =
    mockData.attendanceLast30Days.length > 0
      ? Math.round(
          mockData.attendanceLast30Days.reduce((sum, day) => sum + day.count, 0) /
            mockData.attendanceLast30Days.length
        )
      : 0;

  const followUpProgress =
    fuDone + fuPending > 0
      ? Math.round((fuDone / (fuDone + fuPending)) * 100)
      : 0;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Church Analytics Dashboard</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Overview of church metrics and member engagement
          </p>
        </div>
        <Badge variant="secondary" className="text-xs md:text-sm self-start sm:self-auto">
          Last updated: {new Date().toLocaleDateString()}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Members</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{mockData.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Active church members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Families</CardTitle>
            <Home className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{mockData.totalFamilies}</div>
            <p className="text-xs text-muted-foreground">
              Registered families
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Users</CardTitle>
            <UserPlus className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{mockData.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Groups</CardTitle>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{mockData.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              Active ministry groups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Growth and Engagement Metrics */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">New Members This Month</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-green-600">{mockData.newMembersThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Birthdays Today</CardTitle>
            <Gift className="h-3 w-3 md:h-4 md:w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-pink-600">{mockData.birthdaysToday}</div>
            <p className="text-xs text-muted-foreground">
              Members celebrating today
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Anniversaries Today</CardTitle>
            <Heart className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-red-600">{mockData.anniversariesToday}</div>
            <p className="text-xs text-muted-foreground">
              Couples celebrating today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups and Contributions */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Follow-up Progress</CardTitle>
            <CardDescription className="text-xs md:text-sm">Member care and outreach tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
                <span className="text-xs md:text-sm">Pending Follow-ups</span>
              </div>
              <span className="font-bold text-orange-600 text-sm md:text-base">{fuPending}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                <span className="text-xs md:text-sm">This Month</span>
              </div>
              <span className="font-bold text-blue-600 text-sm md:text-base">{fuPendingThisMonth}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                <span className="text-xs md:text-sm">Completed</span>
              </div>
              <span className="font-bold text-green-600 text-sm md:text-base">{fuDone}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span>Completion Rate</span>
                <span>{followUpProgress}%</span>
              </div>
              <Progress value={followUpProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Financial Overview</CardTitle>
            <CardDescription className="text-xs md:text-sm">Contributions and giving trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                <span className="text-xs md:text-sm">Last Week</span>
              </div>
              <span className="font-bold text-green-600 text-sm md:text-base">
                ${mockData.contributionsLastWeek.toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                <span className="text-xs md:text-sm">Total Events</span>
              </div>
              <span className="font-bold text-blue-600 text-sm md:text-base">{mockData.totalEvents}</span>
            </div>
            
            <div className="text-xs text-muted-foreground mt-4">
              Average weekly giving: ${Math.round(mockData.contributionsLastWeek * 0.85).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Upcoming Events</CardTitle>
          <CardDescription className="text-xs md:text-sm">Scheduled church activities and services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {mockData.upcomingEvents.map((event) => (
              <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm md:text-base">{event.name}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {event.date} at {event.time}
                    </div>
                  </div>
                </div>
                <div className="text-right sm:text-left ml-7 sm:ml-0">
                  <div className="font-medium text-sm md:text-base">{event.attendees}</div>
                  <div className="text-xs text-muted-foreground">expected</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Attendance Last 30 Days</CardTitle>
          <CardDescription className="text-xs md:text-sm">Service attendance tracking and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-medium">Average Attendance</span>
              <span className="text-xl md:text-2xl font-bold text-blue-600">{averageAttendance}</span>
            </div>
            
            <div className="space-y-2">
              {mockData.attendanceLast30Days.map((day, index) => (
                <div key={index} className="flex items-center justify-between gap-2">
                  <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">{day.date}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(day.count / 220) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs md:text-sm font-medium w-8 text-right">{day.count}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground mt-4">
              Highest attendance: 201 | Lowest: 178 | Trend: +2.3%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;