import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Upload, UserPlus, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Student {
  id: number;
  name: string;
  email: string;
  section: string;
  program: string;
  semester: string;
  marked: boolean;
}

interface StudentListProps {
  sessionId?: number;
}

export function StudentList({ sessionId }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", email: "", section: "", program: "", semester: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [programFilter, setProgramFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSection = sectionFilter === "all" || student.section === sectionFilter;
    const matchesProgram = programFilter === "all" || student.program === programFilter;
    const matchesSemester = semesterFilter === "all" || student.semester === semesterFilter;
    
    return matchesSearch && matchesSection && matchesProgram && matchesSemester;
  });

  const uniqueSections = Array.from(new Set(students.map(s => s.section).filter(s => s !== 'N/A'))).sort();
  const uniquePrograms = Array.from(new Set(students.map(s => s.program).filter(s => s !== 'N/A'))).sort();
  const uniqueSemesters = Array.from(new Set(students.map(s => s.semester).filter(s => s !== 'N/A'))).sort();

  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      try {
        const studentRes = await api.get(sessionId ? `/students?sessionId=${sessionId}` : '/students');
        let markedStudentIds = new Set<number>();

        if (sessionId) {
          try {
            const attRes = await api.get(`/attendance?sessionId=${sessionId}`);
            if (attRes.ok) {
              const attData = await attRes.json();
              attData.forEach((record: any) => {
                if (record.status === 'present') {
                  markedStudentIds.add(record.user_id);
                }
              });
            }
          } catch (e) {
            console.error("Failed to fetch attendance");
          }
        }

        if (studentRes.ok) {
          const data = await studentRes.json();
          setStudents(data.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            section: s.section || 'N/A',
            program: s.program || 'N/A',
            semester: s.semester || 'N/A',
            marked: markedStudentIds.has(s.id)
          })));
        }
      } catch (e) {
        console.error("Failed to fetch students");
      }
    };
    fetchStudentsAndAttendance();
  }, [sessionId]);

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.section) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudent.name,
          email: newStudent.email,
          password: 'password123', 
          role: 'student',
          section: newStudent.section,
          program: newStudent.program,
          semester: newStudent.semester
        })
      });

      if (response.ok) {
        const createdUser = await response.json();
        
        const student: Student = {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          section: newStudent.section,
          program: newStudent.program,
          semester: newStudent.semester,
          marked: false,
        };
        setStudents([...students, student]);
        setNewStudent({ name: "", email: "", section: "", program: "", semester: "" });
        setShowAddDialog(false);
        toast({
          title: "Student Added",
          description: `${student.name} has been added successfully`,
        });
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to add student", variant: "destructive" });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      
      toast({
        title: "File Uploaded",
        description: `${file.name} - Excel parsing will be implemented with backend`,
      });
    }
  };

  const handleRemoveStudent = (id: number) => {
    setStudents(students.filter(s => s.id !== id));
    toast({
      title: "Student Removed",
      description: "Student has been removed from the list",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Students in Session</CardTitle>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Excel
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Student Manually</DialogTitle>
                  <DialogDescription>
                    Enter student details to add them to the session
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      placeholder="Enter student name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                      placeholder="Enter student email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="program">Program</Label>
                    <Select value={newStudent.program} onValueChange={(val) => setNewStudent({ ...newStudent, program: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a program..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTech">BTech</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select value={newStudent.semester} onValueChange={(val) => setNewStudent({ ...newStudent, semester: val })}>
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
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Select value={newStudent.section} onValueChange={(val) => setNewStudent({ ...newStudent, section: val })}>
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
                  <Button onClick={handleAddStudent} className="w-full">
                    Add Student
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              <SelectItem value="BTech">BTech</SelectItem>
            </SelectContent>
          </Select>

          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <SelectItem key={sem} value={sem.toString()}>Sem {sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2'].map((sec) => (
                <SelectItem key={sec} value={sec}>{sec}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.program}</TableCell>
                    <TableCell>{student.semester}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>
                      {student.marked ? (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          Present
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStudent(student.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredStudents.length} of {students.length} students
          </span>
          <span>
            {students.filter(s => s.marked).length} marked attendance
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
