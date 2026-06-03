import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import * as Location from "expo-location";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type LocationContextType = {
  location: Coordinate | null;
  loading: boolean;
};

const LocationContext = createContext<LocationContextType>({
  location: null,
  loading: true,
});

export function LocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          setLoading(false);
          return;
        }

        // const lastKnown = await Location.getLastKnownPositionAsync();

        // if (lastKnown) {
        //   setLocation({
        //     latitude: lastKnown.coords.latitude,
        //     longitude: lastKnown.coords.longitude,
        //   });

        //   setLoading(false);
        // }

        const result = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });

        setLocation({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
    };

    loadLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ location, loading }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  return useContext(LocationContext);
}