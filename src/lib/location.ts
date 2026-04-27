

export interface Location {
  latitude: number;
  longitude: number;
}

export interface LocationPermissionResult {
  granted: boolean;
  error?: string;
}


export const requestLocationPermission = async (): Promise<LocationPermissionResult> => {
  if (!navigator.geolocation) {
    return {
      granted: false,
      error: "Geolocation is not supported by your browser",
    };
  }

  try {
    
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      return {
        granted: permission.state === "granted" || permission.state === "prompt",
      };
    }
    
    return { granted: true };
  } catch (error) {
    return {
      granted: true, 
    };
  }
};


export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};


export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371e3; 
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; 
  return distance;
};


export const isWithinRadius = (
  studentLocation: Location,
  teacherLocation: Location,
  radiusMeters: number = 100
): boolean => {
  const distance = calculateDistance(studentLocation, teacherLocation);
  return distance <= radiusMeters;
};


export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};
