import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Trash2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Course {
  id: number;
  course_name: string;
  course_code: string;
}

export default function AdminDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const { toast } = useToast();

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddCourse = async () => {
    if (!courseName.trim() || !courseCode.trim()) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }
    try {
      const res = await api.post('/courses', { courseName, courseCode });
      if (res.ok) {
        await fetchCourses();
        setCourseName("");
        setCourseCode("");
        toast({ title: "Course Added", description: `${courseName} created successfully.` });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to add course", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage courses and global system settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Course</CardTitle>
            <CardDescription>Add a new course for teachers to start sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Course Name</Label>
              <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Intro to CS" />
            </div>
            <div className="space-y-2">
              <Label>Course Code</Label>
              <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. CS101" />
            </div>
            <Button onClick={handleAddCourse} className="w-full">Create Course</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Courses</CardTitle>
            <CardDescription>All courses registered in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses created yet.</p>
            ) : (
              <div className="space-y-3">
                {courses.map(course => (
                  <div key={course.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{course.course_name}</p>
                        <Badge variant="secondary">{course.course_code}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
