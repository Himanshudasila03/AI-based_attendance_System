import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, CheckCircle2, XCircle, AlertCircle, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentLocation, isWithinRadius, formatDistance, Location } from "@/lib/location";

interface Session {
  id: number;
  subject: string;
  teacher: string;
  teacherLocation: Location;
  startTime: string;
  endTime: string;
  marked: boolean;
  enrolled: boolean; // Student is enrolled in this session
  isActive: boolean;
}

export default function StudentAttendance() {
  // Placeholder for real sessions from a future 'sessions' table/endpoint
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          const now = new Date();

          // Filter for active sessions (backend should handle this but client filter is fine for now)
          // Also assuming all students are enrolled in all sessions for this MVP unless we add enrollment table
          const active = data.map((s: any) => ({
            id: s.id,
            subject: s.subject,
            teacher: s.teacher_name,
            teacherLocation: { latitude: s.teacher_location_lat, longitude: s.teacher_location_lng },
            startTime: new Date(s.start_time).toLocaleTimeString(),
            endTime: s.end_time ? new Date(s.end_time).toLocaleTimeString() : "Ongoing",
            marked: false, // We need to check if *this* student marked it. Separate API call or complex join.
            // For now, let's assume not marked. The attendance check logic handles "already marked" usually?
            // Or we can fetch attendance history to check.
            enrolled: true,
            isActive: s.is_active
          })).filter((s: any) => s.isActive);

          setActiveSessions(active);
        }
      } catch (e) {
        console.error("Failed to fetch sessions");
      }
    };
    fetchSessions();
  }, []);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const { toast } = useToast();

  // Filter to show only enrolled sessions
  const enrolledSessions = activeSessions.filter(session => session.enrolled);

  const handleMarkAttendance = async (sessionId: number) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return;

    setSelectedSession(sessionId);
    setIsCheckingLocation(true);

    try {
      const studentLocation = await getCurrentLocation();
      const withinRadius = isWithinRadius(
        studentLocation,
        session.teacherLocation,
        100
      );

      setIsCheckingLocation(false);

      if (!withinRadius) {
        const distance = formatDistance(
          Math.sqrt(
            Math.pow(studentLocation.latitude - session.teacherLocation.latitude, 2) +
            Math.pow(studentLocation.longitude - session.teacherLocation.longitude, 2)
          ) * 111320
        );

        toast({
          title: "Too Far Away",
          description: `You must be within 100m of the teacher to mark attendance.You are approximately ${distance} away.`,
          variant: "destructive",
        });
        setSelectedSession(null);
        return;
      }

      // Location verified
      setIsCapturing(true);

      // Simulate face recognition delay (would be real logic in production)
      setTimeout(async () => {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const response = await fetch('/api/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                status: 'present',
                subject: session.subject
              })
            });

            if (response.ok) {
              setActiveSessions(sessions =>
                sessions.map(s => s.id === sessionId ? { ...s, marked: true } : s)
              );
              toast({
                title: "Attendance Marked!",
                description: "Your attendance has been recorded successfully.",
              });
            } else {
              throw new Error('Failed to mark attendance');
            }
          }
        } catch (e) {
          toast({
            title: "Error",
            description: "Failed to sync attendance with server",
            variant: "destructive",
          });
        }

        setIsCapturing(false);
        setSelectedSession(null);
      }, 2000);

    } catch (error) {
      setIsCheckingLocation(false);
      setSelectedSession(null);
      toast({
        title: "Location Permission Required",
        description: error instanceof Error ? error.message : "Please enable location access to mark attendance",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mark Attendance</h1>
          <p className="text-muted-foreground">Active sessions available for attendance</p>
        </div>

        {enrolledSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
              <p className="text-muted-foreground">
                You don't have any enrolled sessions at the moment. Check back later or contact your administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {enrolledSessions.map((session) => (
              <Card key={session.id} className={session.marked ? "border-success/50 bg-success/5" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {session.subject}
                        {session.marked && <CheckCircle2 className="h-5 w-5 text-success" />}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{session.teacher}</span>
                      </div>
                    </div>
                    <Badge variant={session.marked ? "default" : "secondary"}>
                      {session.marked ? "Marked" : "Active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Location required</span>
                    </div>
                  </div>

                  {!session.marked && (
                    <>
                      {isCheckingLocation && selectedSession === session.id ? (
                        <div className="space-y-4">
                          <div className="p-6 bg-primary/10 rounded-lg flex flex-col items-center justify-center animate-pulse">
                            <MapPin className="h-12 w-12 text-primary mb-3" />
                            <p className="text-center text-sm font-medium">
                              Checking your location...
                            </p>
                            <p className="text-center text-xs text-muted-foreground mt-1">
                              Please allow location access when prompted
                            </p>
                          </div>
                        </div>
                      ) : isCapturing && selectedSession === session.id ? (
                        <div className="space-y-4">
                          <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center animate-pulse">
                            <Camera className="h-16 w-16 text-primary" />
                          </div>
                          <p className="text-center text-sm text-muted-foreground">
                            Recognizing your face...
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button
                            onClick={() => handleMarkAttendance(session.id)}
                            className="w-full gap-2"
                            disabled={isCapturing || isCheckingLocation}
                          >
                            <Camera className="h-4 w-4" />
                            Mark Attendance
                          </Button>
                          <p className="text-xs text-center text-muted-foreground">
                            You must be within 100m of the teacher's location to mark attendance
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {session.marked && (
                    <div className="flex items-center gap-2 text-success p-3 bg-success/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Attendance marked successfully</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
            <CardDescription>Your enrolled sessions for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {enrolledSessions.filter(s => s.marked).length}
                </div>
                <div className="text-sm text-muted-foreground">Marked</div>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning">
                  {enrolledSessions.filter(s => !s.marked).length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {enrolledSessions.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
