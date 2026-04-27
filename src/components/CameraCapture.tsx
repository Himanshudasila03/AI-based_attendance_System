import { useState, useRef } from "react";
import { Camera, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function CameraCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvas.toDataURL("image/png"));
        stopCamera();


        setTimeout(() => {
          toast({
            title: "Face Recognized",
            description: "Attendance marked successfully!",
          });
        }, 1000);
      }
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Face Recognition Capture
        </CardTitle>
        <CardDescription>Position your face within the frame to mark attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {!isCapturing && !capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Camera preview will appear here</p>
              </div>
            </div>
          )}
          {capturedImage && (
            <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${isCapturing ? "block" : "hidden"}`}
          />
          {isCapturing && (
            <div className="absolute inset-0 border-4 border-primary/50 rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-primary rounded-lg"></div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {!isCapturing && !capturedImage && (
            <Button onClick={startCamera} className="gap-2">
              <Camera className="h-4 w-4" />
              Start Camera
            </Button>
          )}
          {isCapturing && (
            <>
              <Button onClick={capturePhoto} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Capture Photo
              </Button>
              <Button onClick={stopCamera} variant="outline" className="gap-2">
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {capturedImage && (
            <Button
              onClick={() => {
                setCapturedImage(null);
                startCamera();
              }}
              variant="outline"
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Retake Photo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
