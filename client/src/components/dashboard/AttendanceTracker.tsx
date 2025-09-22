import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getServices, markAttendance, getCurrentUser, type Service } from '@/lib/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AttendanceTracker: React.FC = () => {
  const { user, login } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setServices(getServices());
  }, []);

  const handleAttendanceToggle = (serviceId: string, present: boolean) => {
    if (!user) return;

    const success = markAttendance(user.id, serviceId, present);
    
    if (success) {
      // Refresh user data
      const updatedUser = getCurrentUser();
      if (updatedUser) {
        login(updatedUser);
      }
      setMessage(`Attendance ${present ? 'marked' : 'removed'} successfully!`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getAttendanceForService = (service: Service) => {
    if (!user) return null;
    return user.attendance.find(
      a => a.serviceType === service.name && a.date === service.date
    );
  };

  const getServiceTypeColor = (type: Service['type']) => {
    switch (type) {
      case 'sunday-service':
        return 'bg-blue-100 text-blue-800';
      case 'bible-study':
        return 'bg-green-100 text-green-800';
      case 'prayer-meeting':
        return 'bg-purple-100 text-purple-800';
      case 'special-event':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatServiceType = (type: Service['type']) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const totalAttended = user?.attendance.filter(a => a.present).length || 0;
  const attendanceRate = services.length > 0 ? Math.round((totalAttended / services.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {message && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Summary
          </CardTitle>
          <CardDescription>
            Your participation in church services and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalAttended}</div>
              <div className="text-sm text-blue-600">Services Attended</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{services.length}</div>
              <div className="text-sm text-green-600">Total Services</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{attendanceRate}%</div>
              <div className="text-sm text-purple-600">Attendance Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Services</CardTitle>
          <CardDescription>
            Mark your attendance for church services and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => {
              const attendance = getAttendanceForService(service);
              const isAttended = attendance?.present || false;
              
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      <Badge className={getServiceTypeColor(service.type)}>
                        {formatServiceType(service.type)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(service.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {service.time}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {attendance && (
                      <div className="flex items-center gap-1 text-sm">
                        {isAttended ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={isAttended ? 'text-green-600' : 'text-red-600'}>
                          {isAttended ? 'Present' : 'Absent'}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={isAttended ? "default" : "outline"}
                        onClick={() => handleAttendanceToggle(service.id, true)}
                      >
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant={attendance && !isAttended ? "destructive" : "outline"}
                        onClick={() => handleAttendanceToggle(service.id, false)}
                      >
                        Absent
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {services.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services scheduled at the moment.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};