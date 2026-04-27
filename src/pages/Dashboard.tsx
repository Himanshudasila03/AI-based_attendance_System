import { Calendar, CheckCircle, Clock, TrendingUp, LogOut } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { AttendanceTable } from "@/components/AttendanceTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface DashboardProps {
  userRole: "student" | "teacher";
}



export default function Dashboard({ userRole }: DashboardProps) {
  const isStudent = userRole === "student";
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0
  });

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await api.get('/attendance');
        if (response.ok) {
          const data = await response.json();

          const formattedData = data.map((record: any) => ({
            id: String(record.id),
            studentName: record.student_name || 'Unknown',
            date: new Date(record.timestamp).toLocaleDateString(),
            time: new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: record.status as 'present' | 'absent' | 'late',
            subject: record.session_subject,
            program: record.program,
            semester: record.semester,
            section: record.section
          }));

          setAttendanceData(formattedData);

          const total = formattedData.length;
          const present = formattedData.filter((r: any) => r.status === 'present').length;
          const late = formattedData.filter((r: any) => r.status === 'late').length;
          const absent = formattedData.filter((r: any) => r.status === 'absent').length;

          setStats({ total, present, late, absent });
        }
      } catch (error) {
        console.error("Failed to fetch attendance");
      }
    };

    fetchAttendance();
  }, [userRole]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isStudent ? "Student Dashboard" : "Teacher Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isStudent ? "Track your attendance and performance" : "Monitor class attendance and manage sessions"}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline" size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isStudent ? (
          <>
            <StatCard title="Total Classes" value={String(stats.total)} icon={Calendar} />
            <StatCard
              title="Present"
              value={String(stats.present)}
              icon={CheckCircle}
            />
            <StatCard title="Attendance Rate" value={`${stats.total ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0}%`} icon={TrendingUp} />
            <StatCard title="Late Arrivals" value={String(stats.late)} icon={Clock} />
          </>
        ) : (
          <>
            <StatCard title="Total Students" value="--" icon={Calendar} />
            <StatCard
              title="Present Today"
              value={String(stats.present)}
              icon={CheckCircle}
            />
            <StatCard title="Absent" value={String(stats.absent)} icon={Clock} />
            <StatCard
              title="Average Attendance"
              value={`${stats.total ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0}%`}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records</CardTitle>
          <CardDescription>
            {isStudent ? "Your recent attendance history" : "Latest attendance entries"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceTable records={attendanceData} isTeacher={!isStudent} />
        </CardContent>
      </Card>
    </div>
  );
}
