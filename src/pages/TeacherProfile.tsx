import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail } from "lucide-react";

export default function TeacherProfile() {
    const [teacherData, setTeacherData] = useState({
        name: "",
        email: "",
        role: "Teacher"
    });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setTeacherData({
                name: user.name || "N/A",
                email: user.email || "N/A",
                role: "Teacher"
            });
        }
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
                    <p className="text-muted-foreground">View and manage your account details</p>
                </div>

                {}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Your personal details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">Full Name</span>
                                </div>
                                <p className="text-base font-semibold ml-6">{teacherData.name}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span className="font-medium">Email</span>
                                </div>
                                <p className="text-base ml-6">{teacherData.email}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
