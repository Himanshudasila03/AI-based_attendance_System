import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import * as faceapi from "face-api.js";
import { api } from "@/lib/api";

export default function RegisterFace() {
  const [step, setStep] = useState<"start" | "loadingModels" | "capturing" | "processing" | "success">("start");
  const [captureProgress, setCaptureProgress] = useState(0);
  const [searchParams] = useSearchParams();
  const isUpdate = searchParams.get("mode") === "update";
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadModels = async () => {
    setStep("loadingModels");
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);
      startCamera();
    } catch (error) {
      console.error("Failed to load models:", error);
      toast({
        title: "Error",
        description: "Failed to load face recognition models.",
        variant: "destructive"
      });
      setStep("start");
    }
  };

  const startCamera = async () => {
    setStep("capturing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access to register your face.",
        variant: "destructive"
      });
      setStep("start");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;

    // Detect face
    const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
    
    if (detection) {
      setStep("processing");
      setCaptureProgress(100);
      stopCamera();

      try {
        const descriptorArray = Array.from(detection.descriptor);
        const response = await api.post('/face-encoding', { encodingData: descriptorArray });

        if (response.ok) {
          localStorage.setItem("faceRegistered", "true");
          localStorage.setItem("faceRegisteredDate", new Date().toLocaleDateString());
          setStep("success");
          toast({
            title: isUpdate ? "Face Updated Successfully!" : "Face Registered Successfully!",
            description: isUpdate
              ? "Your face data has been updated for attendance recognition"
              : "Your face data has been saved for attendance recognition",
          });
        } else {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to save face encoding");
        }
      } catch (error: any) {
        toast({
          title: "Registration Failed",
          description: error.message || "Could not save your face data. Please try again.",
          variant: "destructive"
        });
        setStep("start");
      }
    } else {
      toast({
        title: "No Face Detected",
        description: "Please ensure your face is clearly visible in the camera.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleComplete = () => {
    navigate(isUpdate ? "/profile" : "/dashboard");
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center relative">
          {step === "start" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="absolute left-0 top-0 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <CardTitle className="text-3xl font-bold">
            {isUpdate ? "Update Your Face" : "Register Your Face"}
          </CardTitle>
          <CardDescription>
            {isUpdate
              ? "We'll re-capture your face data to update the recognition system"
              : "We'll capture a clear image of your face to train the recognition system"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "start" && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <Camera className="h-24 w-24 text-muted-foreground" />
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-left text-sm">
                    <p className="font-medium text-foreground">Tips for best results:</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>• Ensure good lighting</li>
                      <li>• Look directly at the camera</li>
                      <li>• Remove glasses if possible</li>
                      <li>• Keep a neutral expression</li>
                    </ul>
                  </div>
                </div>
              </div>
              <Button onClick={loadModels} size="lg" className="w-full">
                {isUpdate ? "Start Face Update" : "Start Face Registration"}
              </Button>
            </div>
          )}

          {step === "loadingModels" && (
             <div className="text-center space-y-6">
               <div className="mx-auto w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                 <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
               </div>
               <div className="space-y-2">
                 <h3 className="text-lg font-semibold">Loading Recognition Models</h3>
                 <p className="text-muted-foreground">Please wait a moment...</p>
               </div>
             </div>
          )}

          {step === "capturing" && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-80 h-64 bg-black rounded-lg overflow-hidden relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className="w-full h-full object-cover transform -scale-x-100"
                  onPlay={() => setCaptureProgress(50)}
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Align your face</h3>
                <p className="text-muted-foreground">
                  Look directly at the camera and click Capture.
                </p>
                <Progress value={captureProgress} className="w-full" />
                <Button onClick={captureFace} size="lg" className="w-full">
                  Capture Face
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Processing Face Data</h3>
                <p className="text-muted-foreground">
                  Extracting facial features...
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-64 h-64 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-24 w-24 text-success" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-success">
                  {isUpdate ? "Update Complete!" : "Registration Complete!"}
                </h3>
                <p className="text-muted-foreground">
                  {isUpdate
                    ? "Your face data has been successfully updated. You can continue marking attendance as usual."
                    : "Your face has been successfully registered. You can now mark attendance using face recognition."
                  }
                </p>
              </div>
              <Button onClick={handleComplete} size="lg" className="w-full">
                {isUpdate ? "Back to Profile" : "Continue to Dashboard"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
