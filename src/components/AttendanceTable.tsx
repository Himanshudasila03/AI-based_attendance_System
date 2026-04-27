import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface AttendanceRecord {
  id: string;
  studentName: string;
  date: string;
  time: string;
  status: "present" | "absent" | "late";
  subject?: string;
  program?: string;
  semester?: string;
  section?: string;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  isTeacher?: boolean;
}

export function AttendanceTable({ records, isTeacher }: AttendanceTableProps) {
  const getStatusBadge = (status: AttendanceRecord["status"]) => {
    const variants = {
      present: "default",
      absent: "destructive",
      late: "secondary",
    } as const;

    return (
      <Badge
        variant={variants[status]}
        className={
          status === "present"
            ? "bg-success text-success-foreground hover:bg-success/90"
            : status === "late"
            ? "bg-warning text-warning-foreground hover:bg-warning/90"
            : ""
        }
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const [filterProgram, setFilterProgram] = useState<string>("BTech");
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [subjectOptions, setSubjectOptions] = useState<any[]>([]);

  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (!isTeacher) {
      const fetchStudentSubjects = async () => {
        try {
          const res = await api.get('/enrollments');
          if (res.ok) {
            const data = await res.json();
            setStudentSubjects(data.map((e: any) => e.course_name).sort());
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchStudentSubjects();
    }
  }, [isTeacher]);

  useEffect(() => {
    const fetchProgramSubjects = async () => {
      if (filterProgram !== "all" && filterSemester !== "all") {
        try {
          const res = await api.get(`/program-subjects?program=${encodeURIComponent(filterProgram)}&semester=${encodeURIComponent(filterSemester)}`);
          if (res.ok) {
            const data = await res.json();
            setSubjectOptions(data);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setSubjectOptions([]);
        setFilterSubject("all");
      }
    };
    fetchProgramSubjects();
  }, [filterProgram, filterSemester]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchProgram = filterProgram === "all" || record.program === filterProgram;
      const matchSemester = filterSemester === "all" || String(record.semester) === filterSemester;
      const matchSubject = filterSubject === "all" || record.subject === filterSubject;
      const matchSection = filterSection === "all" || record.section === filterSection;
      return matchProgram && matchSemester && matchSubject && matchSection;
    });
  }, [records, filterProgram, filterSemester, filterSubject, filterSection]);

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = ["Student Name", "Program", "Semester", "Section", "Date", "Time", "Subject", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredRecords.map(r => `"${r.studentName}","${r.program || ""}","${r.semester || ""}","${r.section || ""}","${r.date}","${r.time}","${r.subject || ""}","${r.status}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-muted/20 p-4 rounded-lg border border-border">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="space-y-1 w-full md:w-32">
              <Label className="text-xs">Program</Label>
              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  <SelectItem value="BTech">BTech</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 w-full md:w-32">
              <Label className="text-xs">Semester</Label>
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 w-full md:w-32">
              <Label className="text-xs">Section</Label>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2'].map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 w-full md:w-64">
              <Label className="text-xs">Subject</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject} disabled={subjectOptions.length === 0}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={subjectOptions.length ? "All Subjects" : "Select Program & Sem"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjectOptions.map(s => <SelectItem key={s.id} value={s.course_name}>{s.course_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2" disabled={filteredRecords.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}
      {!isTeacher && (
        <div className="flex flex-col sm:flex-row justify-between items-end bg-muted/20 p-4 rounded-lg border border-border gap-4">
          <div className="space-y-1 w-full sm:w-64">
            <Label className="text-xs">Filter by Subject</Label>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {studentSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2" disabled={filteredRecords.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Student Name</TableHead>
              {(isTeacher || records.some(r => r.program)) && <TableHead className="font-semibold">Program</TableHead>}
              {(isTeacher || records.some(r => r.semester)) && <TableHead className="font-semibold">Sem</TableHead>}
              {(isTeacher || records.some(r => r.section)) && <TableHead className="font-semibold">Section</TableHead>}
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Time</TableHead>
              {(isTeacher || records.some(r => r.subject)) && <TableHead className="font-semibold">Subject</TableHead>}
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isTeacher ? 7 : 5} className="text-center py-8 text-muted-foreground">
                  No attendance records found
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{record.studentName}</TableCell>
                  {(isTeacher || records.some(r => r.program)) && <TableCell>{record.program || '-'}</TableCell>}
                  {(isTeacher || records.some(r => r.semester)) && <TableCell>{record.semester || '-'}</TableCell>}
                  {(isTeacher || records.some(r => r.section)) && <TableCell>{record.section || '-'}</TableCell>}
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.time}</TableCell>
                  {(isTeacher || records.some(r => r.subject)) && <TableCell>{record.subject || '-'}</TableCell>}
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
