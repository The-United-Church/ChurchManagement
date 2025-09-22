import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

// Mock data for upcoming events in the next 30 days
const upcomingEvents = [
  {
    id: 1,
    title: 'Sunday Worship Service',
    date: '2025-09-08',
    time: '10:00 AM',
    location: 'Main Sanctuary',
    description: 'Join us for worship, prayer, and fellowship',
    attendees: 180,
    category: 'worship'
  },
  {
    id: 2,
    title: 'Bible Study Group',
    date: '2025-09-10',
    time: '7:00 PM',
    location: 'Fellowship Hall',
    description: 'Studying the Book of Romans - Chapter 8',
    attendees: 45,
    category: 'study'
  },
  {
    id: 3,
    title: 'Youth Meeting',
    date: '2025-09-12',
    time: '6:00 PM',
    location: 'Youth Center',
    description: 'Games, worship, and teaching for ages 13-18',
    attendees: 32,
    category: 'youth'
  },
  {
    id: 4,
    title: 'Prayer Meeting',
    date: '2025-09-14',
    time: '7:30 PM',
    location: 'Prayer Room',
    description: 'Come together in prayer for our community',
    attendees: 28,
    category: 'prayer'
  },
  {
    id: 5,
    title: 'Community Outreach',
    date: '2025-09-16',
    time: '9:00 AM',
    location: 'Downtown Park',
    description: 'Serving meals to those in need',
    attendees: 25,
    category: 'outreach'
  },
  {
    id: 6,
    title: 'Worship Team Practice',
    date: '2025-09-18',
    time: '7:00 PM',
    location: 'Main Sanctuary',
    description: 'Rehearsal for Sunday worship service',
    attendees: 12,
    category: 'worship'
  }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'worship':
      return 'bg-blue-100 text-blue-800';
    case 'study':
      return 'bg-green-100 text-green-800';
    case 'youth':
      return 'bg-purple-100 text-purple-800';
    case 'prayer':
      return 'bg-orange-100 text-orange-800';
    case 'outreach':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const MemberHome: React.FC = () => {
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome Home</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Stay connected with upcoming church events and activities
          </p>
        </div>
        <Badge variant="secondary" className="text-xs md:text-sm self-start sm:self-auto">
          Next 30 Days
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Next Event</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm md:text-lg font-bold">Sunday</div>
            <p className="text-xs text-muted-foreground">
              Worship Service
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">This Week</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">3 Events</div>
            <p className="text-xs text-muted-foreground">
              Sunday Service, Bible Study, Youth Meeting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Upcoming Events</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Church activities and events in the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm md:text-base">{event.title}</h3>
                      <Badge className={`text-xs ${getCategoryColor(event.category)}`}>
                        {event.category}
                      </Badge>
                    </div>
                    
                    <p className="text-xs md:text-sm text-gray-600 mb-3">
                      {event.description}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees} attending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base">View Calendar</h3>
                <p className="text-xs text-gray-600">See all upcoming events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base">Member Directory</h3>
                <p className="text-xs text-gray-600">Connect with other members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base">My Registrations</h3>
                <p className="text-xs text-gray-600">View your event registrations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberHome;