import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, XCircle, User, Mail, Calendar, BookOpen, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function StudentProfile() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load student data from local storage/auth context
  const [studentData, setStudentData] = useState({
    name: "",
    studentId: "",
    email: "",
    section: "",
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setStudentData({
        name: user.name || "N/A",
        studentId: user.student_id || user.studentId || "N/A", // Handle mixed case potential
        email: user.email || "N/A",
        section: user.section || "N/A"
      });
    }
  }, []);

  const [faceStatus, setFaceStatus] = useState({
    registered: false,
    date: null as string | null,
  });

  // Load face registration status from localStorage
  useEffect(() => {
    const faceRegistered = localStorage.getItem("faceRegistered") === "true";
    const faceRegisteredDate = localStorage.getItem("faceRegisteredDate");
    setFaceStatus({
      registered: faceRegistered,
      date: faceRegisteredDate,
    });
  }, []);

  const handleRegisterFace = () => {
    // Navigate to face registration page
    navigate("/register-face");
  };

  const handleUpdateFace = () => {
    // Navigate to face registration page to update with mode parameter
    navigate("/register-face?mode=update");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account and face recognition settings</p>
        </div>

        {/* Profile Information Card */}
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

        {/* Face Recognition Card */}
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
                    Need to update your face data? You can re-register if your appearance has changed significantly.
                  </p>
                  <Button
                    onClick={handleUpdateFace}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Update Face Registration
                  </Button>
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

        {/* Additional Info Card */}
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
