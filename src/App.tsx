import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AttendanceSidebar } from "@/components/AttendanceSidebar";
import Dashboard from "./pages/Dashboard";
import CaptureAttendance from "./pages/CaptureAttendance";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RegisterFace from "./pages/RegisterFace";
import StudentAttendance from "./pages/StudentAttendance";
import StudentProfile from "./pages/StudentProfile";
import TeacherProfile from "./pages/TeacherProfile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut } from "lucide-react";
import { StudentList } from "@/components/StudentList";

const queryClient = new QueryClient();

const App = () => {
  const [userRole, setUserRole] = useState<"student" | "teacher" | "admin">(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).role : "student";
  });

  const [userName, setUserName] = useState<string>(() => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).name : "";
    } catch {
      return "";
    }
  });

  const handleSetUserRole = (role: "student" | "teacher" | "admin") => {
    setUserRole(role);
    try {
      const user = localStorage.getItem('user');
      if (user) setUserName(JSON.parse(user).name || "");
    } catch {}
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login setUserRole={handleSetUserRole} />} />
            <Route path="/signup" element={<Signup setUserRole={handleSetUserRole} />} />
            <Route path="/register-face" element={<RegisterFace />} />
            <Route path="/student-attendance" element={<StudentAttendance />} />
            <Route
              path="/*"
              element={
                <SidebarProvider>
                  <div className="min-h-screen flex w-full bg-background">
                    <AttendanceSidebar userRole={userRole} />
                    <div className="flex-1 flex flex-col">
                      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
                        <SidebarTrigger className="lg:hidden" />
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-8 w-8 text-muted-foreground" />
                            <div className="text-sm">
                              <div className="font-medium">
                                {userName || userRole}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              localStorage.removeItem('user');
                              localStorage.removeItem('token');
                              window.location.href = '/login';
                            }}
                            title="Logout"
                          >
                            <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </header>
                      <main className="flex-1 p-6 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Dashboard userRole={userRole} />} />
                          <Route path="/dashboard" element={<Dashboard userRole={userRole} />} />
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/capture" element={<CaptureAttendance />} />
                          <Route path="/attendance" element={<StudentAttendance />} />
                          <Route path="/profile" element={userRole === "student" ? <StudentProfile /> : <TeacherProfile />} />
                          <Route path="/records" element={<Dashboard userRole={userRole} />} />
                          <Route path="/students" element={
                            <div className="space-y-6">
                              <div>
                                <h1 className="text-3xl font-bold text-foreground mb-2">Manage Users</h1>
                                <p className="text-muted-foreground">View and manage enrolled students</p>
                              </div>
                              <StudentList />
                            </div>
                          } />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider >
    </QueryClientProvider >
  );
};

export default App;

