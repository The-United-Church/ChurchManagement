import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Mock registration data
const registrations = [
  {
    id: 1,
    eventTitle: 'Sunday Worship Service',
    eventDate: '2025-09-08',
    eventTime: '10:00 AM',
    location: 'Main Sanctuary',
    registrationDate: '2025-09-01',
    status: 'confirmed',
    attendees: 1,
    notes: 'Regular weekly attendance'
  },
  {
    id: 2,
    eventTitle: 'Bible Study Group',
    eventDate: '2025-09-10',
    eventTime: '7:00 PM',
    location: 'Fellowship Hall',
    registrationDate: '2025-09-02',
    status: 'confirmed',
    attendees: 1,
    notes: 'Romans Chapter 8 study'
  },
  {
    id: 3,
    eventTitle: 'Community Outreach',
    eventDate: '2025-09-16',
    eventTime: '9:00 AM',
    location: 'Downtown Park',
    registrationDate: '2025-09-03',
    status: 'pending',
    attendees: 2,
    notes: 'Volunteering with spouse'
  },
  {
    id: 4,
    eventTitle: 'Youth Meeting',
    eventDate: '2025-09-12',
    eventTime: '6:00 PM',
    location: 'Youth Center',
    registrationDate: '2025-09-04',
    status: 'cancelled',
    attendees: 1,
    notes: 'Unable to attend due to conflict'
  },
  {
    id: 5,
    eventTitle: 'Prayer Meeting',
    eventDate: '2025-09-14',
    eventTime: '7:30 PM',
    location: 'Prayer Room',
    registrationDate: '2025-09-05',
    status: 'confirmed',
    attendees: 1,
    notes: 'Weekly prayer commitment'
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'pending':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const MemberRegistrations: React.FC = () => {
  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const cancelledCount = registrations.filter(r => r.status === 'cancelled').length;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Registrations</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            View and manage your event registrations
          </p>
        </div>
        <Badge variant="secondary" className="text-xs md:text-sm self-start sm:self-auto">
          {registrations.length} Total
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-green-600">{confirmedCount}</div>
            <p className="text-xs text-muted-foreground">
              Events confirmed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-red-600">{cancelledCount}</div>
            <p className="text-xs text-muted-foreground">
              Cancelled events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Registrations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Event Registrations</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Your registered events and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {registrations.map((registration) => (
              <div key={registration.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm md:text-base">{registration.eventTitle}</h3>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(registration.status)}
                        <Badge className={`text-xs ${getStatusColor(registration.status)}`}>
                          {registration.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-500 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{registration.eventDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{registration.eventTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{registration.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{registration.attendees} attendee{registration.attendees > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    {registration.notes && (
                      <p className="text-xs md:text-sm text-gray-600 mb-2">
                        <strong>Notes:</strong> {registration.notes}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Registered on {registration.registrationDate}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {registration.status === 'confirmed' && (
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                    )}
                    {registration.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm">
                          Cancel
                        </Button>
                        <Button size="sm">
                          Confirm
                        </Button>
                      </>
                    )}
                    {registration.status === 'cancelled' && (
                      <Button variant="outline" size="sm">
                        Re-register
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberRegistrations;