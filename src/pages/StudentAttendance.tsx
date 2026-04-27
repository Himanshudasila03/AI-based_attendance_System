import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, CheckCircle2, AlertCircle, MapPin, User, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentLocation, isWithinRadius, formatDistance, Location } from "@/lib/location";
import * as faceapi from "face-api.js";
import { api } from "@/lib/api";

interface Session {
  id: number;
  subject: string;
  course_code: string;
  teacher: string;
  teacherLocation: Location;
  startTime: string;
  endTime: string;
  marked: boolean;
  enrolled: boolean; 
  isActive: boolean;
}

export default function StudentAttendance() {
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.get('/sessions');
        if (response.ok) {
          const data = await response.json();
          
          const active = data.map((s: any) => ({
            id: s.id,
            subject: s.subject,
            course_code: s.course_code,
            teacher: s.teacher_name,
            teacherLocation: { latitude: s.teacher_location_lat, longitude: s.teacher_location_lng },
            startTime: new Date(s.start_time).toLocaleTimeString(),
            endTime: s.end_time ? new Date(s.end_time).toLocaleTimeString() : "Ongoing",
            marked: false, 
            enrolled: true,
            isActive: s.is_active
          })).filter((s: any) => s.isActive);

          setActiveSessions(active);
        }
      } catch (e) {
        console.error("Failed to fetch sessions");
      }
    };

    const checkAttendanceStatus = async () => {
        try {
            const res = await api.get('/attendance');
            if (res.ok) {
                const logs = await res.json();
                setActiveSessions(sessions => sessions.map(s => {
                    const hasMarked = logs.some((l: any) => l.session_id === s.id);
                    return hasMarked ? { ...s, marked: true } : s;
                }));
            }
        } catch (e) {
            console.error("Failed to fetch attendance records");
        }
    };

    fetchSessions().then(checkAttendanceStatus);
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      throw new Error("Camera access denied");
    }
  };

  const processAttendance = async (sessionId: number, session: Session) => {
    if (!videoRef.current) return;

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        throw new Error("No face detected in the camera.");
      }

      // Fetch stored encoding
      const response = await api.get('/face-encoding');
      if (!response.ok) {
        throw new Error("Could not retrieve your registered face data.");
      }
      
      const { encodingData } = await response.json();
      const storedDescriptor = new Float32Array(encodingData);

      // Compare
      const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
      
      if (distance > 0.6) {
         throw new Error("Face does not match the registered profile.");
      }

      // Match successful, submit attendance
      const submitRes = await api.post('/attendance', {
        status: 'present',
        sessionId: session.id
      });

      if (submitRes.ok) {
        setActiveSessions(sessions =>
          sessions.map(s => s.id === sessionId ? { ...s, marked: true } : s)
        );
        toast({
          title: "Attendance Marked!",
          description: "Your attendance has been recorded successfully.",
        });
      } else {
        throw new Error('Failed to mark attendance on the server.');
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "An error occurred during verification.",
        variant: "destructive"
      });
    } finally {
      stopCamera();
      setIsCapturing(false);
      setSelectedSession(null);
    }
  };

  const handleMarkAttendance = async (sessionId: number) => {
    if (!modelsLoaded) {
      toast({ title: "Please wait", description: "Loading recognition models...", variant: "default" });
      return;
    }

    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return;

    setSelectedSession(sessionId);
    setIsCheckingLocation(true);

    try {
      const studentLocation = await getCurrentLocation();
      const withinRadius = isWithinRadius(
        studentLocation,
        session.teacherLocation,
        500
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
          description: `You must be within 500m of the teacher to mark attendance. You are approximately ${distance} away.`,
          variant: "destructive",
        });
        setSelectedSession(null);
        return;
      }

      setIsCapturing(true);
      await startCamera();
      
      // Delay to allow camera to adjust
      setTimeout(() => {
        processAttendance(sessionId, session);
      }, 2000);

    } catch (error) {
      setIsCheckingLocation(false);
      setSelectedSession(null);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Please enable location access and camera to mark attendance",
        variant: "destructive",
      });
    }
  };

  const enrolledSessions = activeSessions.filter(session => session.enrolled);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mark Attendance</h1>
          <p className="text-muted-foreground">Active sessions for your enrolled courses</p>
        </div>

        {enrolledSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
              <p className="text-muted-foreground">
                There are no active sessions for any of your enrolled courses right now.
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">{session.course_code}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{session.teacher}</span>
                        </div>
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
                          <div className="mx-auto w-80 h-64 bg-black rounded-lg overflow-hidden relative">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              muted 
                              playsInline
                              className="w-full h-full object-cover transform -scale-x-100"
                            />
                          </div>
                          <p className="text-center text-sm text-muted-foreground">
                            Recognizing your face... Please hold still.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button
                            onClick={() => handleMarkAttendance(session.id)}
                            className="w-full gap-2"
                            disabled={isCapturing || isCheckingLocation || !modelsLoaded}
                          >
                            <Camera className="h-4 w-4" />
                            Mark Attendance
                          </Button>
                          <p className="text-xs text-center text-muted-foreground">
                            You must be within 500m of the teacher's location to mark attendance
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
