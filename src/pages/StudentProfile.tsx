import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, XCircle, User, Mail, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function StudentProfile() {
  const { toast } = useToast();
  const navigate = useNavigate();

  
  const [studentData, setStudentData] = useState({
    name: "",
    studentId: "",
    email: "",
    section: "",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await api.get('/me');
        if (res.ok) {
          const user = await res.json();
          setStudentData({
            name: user.name || "N/A",
            studentId: user.student_id || user.studentId || "N/A", 
            email: user.email || "N/A",
            section: user.section || "N/A"
          });
          
          // Also update local storage so other components have fresh data
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const currentLocal = JSON.parse(userStr);
            localStorage.setItem('user', JSON.stringify({ ...currentLocal, ...user }));
          }
        } else {
          // Fallback to local storage
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            setStudentData({
              name: user.name || "N/A",
              studentId: user.student_id || user.studentId || "N/A", 
              email: user.email || "N/A",
              section: user.section || "N/A"
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUserData();
  }, []);

  const [faceStatus, setFaceStatus] = useState({
    registered: false,
    date: null as string | null,
  });

  
  useEffect(() => {
    const faceRegistered = localStorage.getItem("faceRegistered") === "true";
    const faceRegisteredDate = localStorage.getItem("faceRegisteredDate");
    setFaceStatus({
      registered: faceRegistered,
      date: faceRegisteredDate,
    });
  }, []);

  const handleRegisterFace = () => {
    navigate("/register-face");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account and face recognition settings</p>
        </div>

        {}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your personal and academic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Full Name</span>
                </div>
                <p className="text-base font-semibold ml-6">{studentData.name}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge className="h-4 w-4" />
                  <span className="font-medium">Student ID</span>
                </div>
                <p className="text-base font-semibold ml-6">{studentData.studentId}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-base ml-6">{studentData.email}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Section</span>
                </div>
                <p className="text-base ml-6">{studentData.section}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {}
        <Card className={faceStatus.registered ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Face Recognition Setup
                  {faceStatus.registered ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-warning" />
                  )}
                </CardTitle>
                <CardDescription>
                  {faceStatus.registered
                    ? "Your face is registered for attendance"
                    : "Register your face to mark attendance"}
                </CardDescription>
              </div>
              <Badge variant={faceStatus.registered ? "default" : "secondary"}>
                {faceStatus.registered ? "Registered" : "Not Registered"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {faceStatus.registered ? (
              <>
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-success mb-1">
                        Face Recognition Active
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You can now mark attendance using face recognition. Your face data is securely stored and used only for attendance verification.
                      </p>
                      {faceStatus.date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Registered on: {faceStatus.date}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If you need to update your face data due to a significant change in appearance, please contact your administrator.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-warning mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning mb-1">
                        Face Not Registered
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You need to register your face before you can mark attendance. This is a one-time setup process.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">What you'll need:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• A device with a working camera</li>
                      <li>• Good lighting conditions</li>
                      <li>• 2-3 minutes of your time</li>
                      <li>• Remove glasses and face masks if possible</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleRegisterFace}
                    className="w-full gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Register Your Face Now
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Security</CardTitle>
            <CardDescription>How we protect your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Your face data is encrypted and stored securely. It is used exclusively for attendance verification and is never shared with third parties.
              </p>
              <p>
                We follow industry-standard security practices to protect your biometric information.
              </p>
              <p>
                You can update or remove your face data at any time by contacting your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
