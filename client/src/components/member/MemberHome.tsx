import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { useProfile } from '@/hooks/useAuthQuery';
import { fetchUserChurches } from '@/lib/api';

const MemberHome: React.FC = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const { data: churchesData, isLoading: loadingChurches } = useQuery({
    queryKey: ['user', 'churches'],
    queryFn: fetchUserChurches,
    staleTime: 5 * 60 * 1000,
  });

  const churches = churchesData?.data ?? [];
  const totalBranches = churches.reduce((acc, c) => acc + (c.branches?.length ?? 0), 0);
  const firstName =
    profile?.first_name ||
    profile?.full_name?.split(' ')[0] ||
    'Member';

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome, {firstName}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Here's an overview of your church membership
          </p>
        </div>
        {profile?.role && (
          <Badge variant="secondary" className="text-xs md:text-sm self-start sm:self-auto capitalize">
            {profile.role}
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Churches</CardTitle>
            <Building2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {loadingChurches ? '—' : churches.length}
            </div>
            <p className="text-xs text-muted-foreground">Memberships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Branches</CardTitle>
            <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {loadingChurches ? '—' : totalBranches}
            </div>
            <p className="text-xs text-muted-foreground">Locations</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Account Status</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold capitalize">
              {profile?.role || '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {profile?.is_active ? 'Active' : 'Inactive'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Church Memberships */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">My Churches</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Churches and branches you are a member of
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChurches ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : churches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Not assigned to a church yet</p>
              <p className="text-xs mt-1">Contact your administrator to get assigned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {churches.map((church) => (
                <div key={church.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-sm md:text-base">
                    {church.denomination_name}
                  </h3>
                  {church.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {church.location}
                      {church.country ? `, ${church.country}` : ''}
                    </p>
                  )}
                  {church.branches && church.branches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {church.branches.map((b) => (
                        <Badge key={b.id} variant="secondary" className="text-xs">
                          {b.name}
                          {b.is_headquarters ? ' (HQ)' : ''}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events — placeholder until events backend is built */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Events
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Events and activities from your church
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No events yet</p>
            <p className="text-xs mt-1">Event scheduling will be available soon.</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/member/calendar')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base">View Calendar</h3>
                <p className="text-xs text-gray-600">See all upcoming events</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/member/directory')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base">Member Directory</h3>
                <p className="text-xs text-gray-600">Connect with other members</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors sm:col-span-2 lg:col-span-1"
          onClick={() => navigate('/member/registrations')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base">My Registrations</h3>
                <p className="text-xs text-gray-600">View your event registrations</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberHome;
