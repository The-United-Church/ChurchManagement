import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, Users, MessageCircle, CheckCircle } from 'lucide-react';

// Mock notifications data
const notifications = [
  {
    id: 1,
    type: 'event',
    title: 'Upcoming Event Reminder',
    message: 'Bible Study Group starts in 2 hours at Fellowship Hall',
    timestamp: '2 hours ago',
    read: false,
    icon: Calendar
  },
  {
    id: 2,
    type: 'announcement',
    title: 'Church Announcement',
    message: 'New youth program starting next month. Registration now open!',
    timestamp: '1 day ago',
    read: false,
    icon: MessageCircle
  },
  {
    id: 3,
    type: 'registration',
    title: 'Registration Confirmed',
    message: 'Your registration for Community Outreach has been confirmed',
    timestamp: '2 days ago',
    read: true,
    icon: CheckCircle
  },
  {
    id: 4,
    type: 'member',
    title: 'New Member Welcome',
    message: 'Welcome our new member, Jennifer Martinez, to our church family!',
    timestamp: '3 days ago',
    read: true,
    icon: Users
  },
  {
    id: 5,
    type: 'event',
    title: 'Event Update',
    message: 'Prayer Meeting location changed to Main Sanctuary',
    timestamp: '1 week ago',
    read: true,
    icon: Calendar
  }
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'event':
      return 'bg-blue-100 text-blue-800';
    case 'announcement':
      return 'bg-green-100 text-green-800';
    case 'registration':
      return 'bg-purple-100 text-purple-800';
    case 'member':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const MemberNotifications: React.FC = () => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Stay updated with church news and events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs md:text-sm">
            {unreadCount} Unread
          </Badge>
          <Button variant="outline" size="sm">
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Your latest church updates and announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => {
              const IconComponent = notification.icon;
              return (
                <div 
                  key={notification.id} 
                  className={`border rounded-lg p-4 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      !notification.read ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`h-4 w-4 ${
                        !notification.read ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-sm md:text-base ${
                          !notification.read ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        <Badge className={`text-xs ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      
                      <p className="text-xs md:text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      
                      <p className="text-xs text-gray-500">
                        {notification.timestamp}
                      </p>
                    </div>
                    
                    {!notification.read && (
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberNotifications;