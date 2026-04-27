import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlayCircle, StopCircle, Plus, Trash2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { StudentList } from "@/components/StudentList";
import { getCurrentLocation, Location } from "@/lib/location";
import { api } from "@/lib/api";

interface Session {
  id: number;
  subject: string;
  course_code: string;
  teacherName: string;
  teacherLocation: Location | null;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  attendanceCount: number;
}

interface Course {
  id: number;
  course_name: string;
  course_code: string;
}

export default function CaptureAttendance() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [sections, setSections] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const { toast } = useToast();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchSessions = async () => {
    try {
      const response = await api.get('/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.map((s: any) => ({
          id: s.id,
          subject: s.subject,
          course_code: s.course_code,
          teacherName: s.teacher_name,
          teacherLocation: { latitude: s.teacher_location_lat, longitude: s.teacher_location_lng },
          startTime: new Date(s.start_time).toLocaleTimeString(),
          endTime: s.end_time ? new Date(s.end_time).toLocaleTimeString() : null,
          isActive: s.is_active,
          attendanceCount: 0 
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchProgramSubjects = async () => {
      if (program && semester) {
        try {
          const res = await api.get(`/program-subjects?program=${encodeURIComponent(program)}&semester=${encodeURIComponent(semester)}`);
          if (res.ok) {
            const data = await res.json();
            setCourses(data);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setCourses([]); // Clear if no program/semester
        setSelectedCourseId("");
      }
    };
    fetchProgramSubjects();
  }, [program, semester]);

  const createSession = async () => {
    if (!selectedCourseId) {
      toast({
        title: "Error",
        description: "Please select a course",
        variant: "destructive",
      });
      return;
    }

    setIsCapturingLocation(true);

    try {
      const location = await getCurrentLocation();

      const response = await api.post('/sessions', {
        courseId: parseInt(selectedCourseId),
        location,
        semester: semester || null,
        sections: sections ? sections.split(',').map(s => s.trim()).filter(s => s) : null
      });

      if (response.ok) {
        await fetchSessions();
        setSelectedCourseId("");
        setSemester("");
        setSections("");
        setShowCreateForm(false);
        const cName = courses.find(c => c.id === parseInt(selectedCourseId))?.course_name;
        toast({
          title: "Session Started",
          description: `${cName} session is now active.`,
        });
      }
    } catch (error) {
      toast({
        title: "Location Error",
        description: error instanceof Error ? error.message : "Failed to get location or create session.",
        variant: "destructive",
      });
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const endSession = async (sessionId: number) => {
    try {
      const response = await api.post(`/sessions/${sessionId}/end`, {});
      if (response.ok) {
        await fetchSessions();
        toast({
          title: "Session Ended",
          description: "Attendance session has been stopped",
        });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to end session", variant: "destructive" });
    }
  };

  const deleteSession = async (sessionId: number) => {
    try {
      const response = await api.delete(`/sessions/${sessionId}`);
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        toast({
          title: "Session Deleted",
          description: "Session has been removed",
        });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
    }
  };

  const activeSession = sessions.find(s => s.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Manage Sessions</h1>
          <p className="text-muted-foreground">Create and manage attendance sessions for students</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="gap-2"
          disabled={activeSession !== undefined}
        >
          <Plus className="h-4 w-4" />
          Create Session
        </Button>
      </div>

      {activeSession && (
        <>
          <Card className="bg-success/10 border-success">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-success font-medium mb-1">
                    ✓ Active Session: {activeSession.subject} ({activeSession.course_code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Started at {activeSession.startTime} • {activeSession.attendanceCount} students marked
                  </p>
                  {activeSession.teacherLocation && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Location captured • Students must be within 100m</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => endSession(activeSession.id)}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  End Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <StudentList sessionId={activeSession.id} />
        </>
      )}

      {showCreateForm && !activeSession && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Session</CardTitle>
            <CardDescription>Select a course to start an attendance session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="program">Program</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTech">BTech</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a semester..." />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Subject</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={!courses.length}>
                <SelectTrigger>
                  <SelectValue placeholder={courses.length ? "Select a subject..." : "Enter Program and Semester first"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.course_name} ({course.course_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sections">Section</Label>
              <Select value={sections} onValueChange={setSections}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section..." />
                </SelectTrigger>
                <SelectContent>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2'].map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={createSession}
                className="gap-2"
                disabled={isCapturingLocation}
              >
                <PlayCircle className="h-4 w-4" />
                {isCapturingLocation ? "Capturing Location..." : "Start Session"}
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                disabled={isCapturingLocation}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your location will be captured to verify student attendance within 500m radius.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>All attendance sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions created yet. Click "Create Session" to start.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{session.subject} ({session.course_code})</h4>
                      <Badge variant={session.isActive ? "default" : "secondary"}>
                        {session.isActive ? "Active" : "Ended"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.startTime} {session.endTime && `- ${session.endTime}`} • {session.attendanceCount} students
                    </p>
                    {session.teacherLocation && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Location-based verification enabled</span>
                      </div>
                    )}
                  </div>
                  {!session.isActive && (
                    <Button
                      onClick={() => deleteSession(session.id)}
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
