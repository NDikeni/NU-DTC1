import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocationContext } from "../context/LocationContext";

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!;

const DINING_HALLS = [
  {
    name: "Allison Dining Commons",
    latitude: 42.050562720012636,
    longitude: -87.67840974766314,
  },
  {
    name: "Sargent Dining Commons",
    latitude: 42.05877944628966,
    longitude: -87.67578362742823,
  },
  {
    name: "Elder Dining Commons",
    latitude: 42.06090456589741,
    longitude: -87.6777334849695,
  },
  {
    name: "Foster Walker Complex",
    latitude: 42.05294008075569,
    longitude: -87.67864991133573,
  },
];

type Coordinate = {
  latitude: number;
  longitude: number;
};

type RouteInfo = {
  name: string;
  distanceText: string;
  durationText: string;
  durationValue: number;
};

type RouteLine = {
  name: string;
  coordinates: Coordinate[];
};

function decodePolyline(encoded: string): Coordinate[] {
  let points: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

function getStraightLineDistanceKm(a: Coordinate, b: Coordinate) {
  const R = 6371;

  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function fetchWithTimeout(url: string, timeoutMs = 5000) {
  return Promise.race([
    fetch(url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("request timeout")), timeoutMs)
    ),
  ]);
}

export default function LocationScreen() {
  const { location: userLocation, loading } = useLocationContext();

  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [routeLines, setRouteLines] = useState<RouteLine[]>([]);
  const [status, setStatus] = useState("Loading your location...");

  const showFastEstimates = (origin: Coordinate) => {
    const estimates = DINING_HALLS.map((hall) => {
      const distanceKm = getStraightLineDistanceKm(origin, hall);
      const walkingMinutes = Math.round((distanceKm / 4.8) * 60);

      return {
        name: hall.name,
        distanceText: `~${distanceKm.toFixed(2)} km`,
        durationText: `~${walkingMinutes} min`,
        durationValue: walkingMinutes * 60,
      };
    }).sort((a, b) => a.durationValue - b.durationValue);

    setRoutes(estimates);
    setStatus("Showing quick estimates. Loading walking routes...");
  };

  const fetchRoutes = async (origin: Coordinate) => {
    const results = await Promise.all(
      DINING_HALLS.map(async (hall) => {
        try {
          const url =
            "https://maps.googleapis.com/maps/api/directions/json?" +
            `origin=${origin.latitude},${origin.longitude}` +
            `&destination=${hall.latitude},${hall.longitude}` +
            "&mode=walking" +
            `&key=${GOOGLE_MAPS_API_KEY}`;

          const response = await fetchWithTimeout(url, 5000);
          const data = await response.json();

          if (data.status !== "OK") {
            console.log("Directions API error:", hall.name, data.status);
            return null;
          }

          const route = data.routes[0];
          const leg = route.legs[0];

          return {
            routeInfo: {
              name: hall.name,
              distanceText: leg.distance.text,
              durationText: leg.duration.text,
              durationValue: leg.duration.value,
            },
            routeLine: {
              name: hall.name,
              coordinates: decodePolyline(route.overview_polyline.points),
            },
          };
        } catch (err) {
          console.log("Route fetch failed:", hall.name, err);
          return null;
        }
      })
    );

    const validResults = results.filter(Boolean) as {
      routeInfo: RouteInfo;
      routeLine: RouteLine;
    }[];

    if (validResults.length === 0) {
      setStatus("Showing estimates. Exact walking routes did not load.");
      return;
    }

    setRoutes(
      validResults
        .map((r) => r.routeInfo)
        .sort((a, b) => a.durationValue - b.durationValue)
    );

    setRouteLines(validResults.map((r) => r.routeLine));

    setStatus("Fastest walking paths loaded.");
  };

  useEffect(() => {
    if (loading) {
      setStatus("Loading your location...");
      return;
    }

    if (!userLocation) {
      setStatus("Location permission was denied or unavailable.");
      return;
    }

    setRouteLines([]);

    showFastEstimates(userLocation);
    fetchRoutes(userLocation);
  }, [loading, userLocation]);

  const mapRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.016,
        longitudeDelta: 0.016,
      }
    : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Dining Hall Map</Text>

        <Text style={styles.subtitle}>
          Use your current location to see the fastest walking paths.
        </Text>

        <Text style={styles.status}>{status}</Text>

        <View style={styles.mapCard}>
          {Platform.OS === "web" ? (
            <View style={styles.emptyMap}>
              <Ionicons name="map-outline" size={54} color="#a78bfa" />

              <Text style={styles.emptyText}>
                Route map works on Expo Go mobile, not web.
              </Text>
            </View>
          ) : userLocation && MapView && Marker && Polyline ? (
            <MapView style={styles.map} region={mapRegion} showsUserLocation>
              <Marker
                coordinate={userLocation}
                title="You are here"
                pinColor="#8b5cf6"
              />

              {DINING_HALLS.map((hall) => (
                <Marker
                  key={hall.name}
                  coordinate={{
                    latitude: hall.latitude,
                    longitude: hall.longitude,
                  }}
                  title={hall.name}
                  pinColor="#c4b5fd"
                />
              ))}

              {routeLines.map((route) => (
                <Polyline
                  key={`line-${route.name}`}
                  coordinates={route.coordinates}
                  strokeWidth={6}
                  strokeColor="#c4b5fd"
                />
              ))}
            </MapView>
          ) : (
            <View style={styles.emptyMap}>
              <Ionicons name="map-outline" size={54} color="#a78bfa" />

              <Text style={styles.emptyText}>
                Loading your location...
              </Text>
            </View>
          )}
        </View>

        <View style={styles.routesCard}>
          <Text style={styles.routesTitle}>Fastest routes</Text>

          {routes.length === 0 ? (
            <Text style={styles.routeEmpty}>No routes loaded yet.</Text>
          ) : (
            routes.map((route) => (
              <View key={route.name} style={styles.routeRow}>
                <Text style={styles.routeName}>{route.name}</Text>

                <Text style={styles.routeDetails}>
                  {route.distanceText} • {route.durationText}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  screenScroll: {
    flex: 1,
  },

  container: {
    paddingTop: 40,
    padding: 22,
    paddingBottom: 120,
  },

  title: {
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 14,
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },

  status: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 14,
  },

  mapCard: {
    height: 360,
    backgroundColor: "#1e293b",
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },

  map: {
    flex: 1,
  },

  emptyMap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  emptyText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },

  routesCard: {
    backgroundColor: "#1e293b",
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },

  routesTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },

  routeEmpty: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "700",
  },

  routeRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },

  routeName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "900",
  },

  routeDetails: {
    color: "#c4b5fd",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
});