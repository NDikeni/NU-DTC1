import React, { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

const API_URL = "http://10.105.51.175:5000";
const USERNAME = "jeongwoo";

type MealPeriod = "BREAKFAST" | "LUNCH" | "DINNER";

type DiningHall =
  | "ALLISON"
  | "SARGE"
  | "ELDER"
  | "PLEX-EAST"
  | "PLEX-WEST";

type User = {
  username: string;
  user_uuid: string;
};

type FavoriteFood = {
  food_uuid: string;
  food_name: string;
  meal_period: MealPeriod;
  dining_hall: DiningHall;
  users_liked_count: number;
  s3_bucket_id?: string | null;
  is_liked_by_user?: boolean;
  preference_date?: string;
  preference_time?: string;
  day_of_week?: string;
};

const diningHallLabels: Record<DiningHall, string> = {
  ALLISON: "Allison",
  SARGE: "Sargent",
  ELDER: "Elder",
  "PLEX-EAST": "Plex East",
  "PLEX-WEST": "Plex West",
};

const mealPeriodLabels: Record<MealPeriod, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const normalizeFavorite = (favorite: any): FavoriteFood => {
    return {
      food_uuid: favorite.food_uuid,
      food_name: favorite.food_name,
      meal_period: favorite.meal_period,
      dining_hall: favorite.dining_hall ?? favorite.dining_hall_name,
      users_liked_count: favorite.users_liked_count ?? 0,
      s3_bucket_id: favorite.s3_bucket_id ?? null,
      is_liked_by_user: true,
      preference_date: favorite.preference_date,
      preference_time: favorite.preference_time,
      day_of_week: favorite.day_of_week,
    };
  };

  const createOrGetUser = async (): Promise<User> => {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: USERNAME,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "failed to load user");
    }

    return data.user;
  };

  const fetchFavorites = async (userUuid: string): Promise<FavoriteFood[]> => {
    const response = await fetch(`${API_URL}/users/${userUuid}/favorites`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "failed to load favorites");
    }

    return (data.favorites ?? []).map(normalizeFavorite);
  };

  const loadProfileData = async () => {
    try {
      setIsLoading(true);

      const currentUser = await createOrGetUser();
      const currentFavorites = await fetchFavorites(currentUser.user_uuid);

      setUser(currentUser);
      setFavorites(currentFavorites);
    } catch (err) {
      console.log("loadProfileData error:", err);
      Alert.alert(
        "Profile error",
        "Could not load your profile data from the backend."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const countBy = <T extends string>(
    items: FavoriteFood[],
    getKey: (item: FavoriteFood) => T
  ) => {
    const counts: Record<string, number> = {};

    items.forEach((item) => {
      const key = getKey(item);
      counts[key] = (counts[key] ?? 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const topFoods = [...favorites]
    .sort((a, b) => b.users_liked_count - a.users_liked_count)
    .slice(0, 5);

  const recentFavorites = favorites.slice(0, 5);

  const topDiningHalls = countBy(favorites, (food) => food.dining_hall);
  const topMealPeriods = countBy(favorites, (food) => food.meal_period);

  const favoriteCount = favorites.length;
  const topDiningHall = topDiningHalls[0];
  const topMealPeriod = topMealPeriods[0];

  const recommendedDishes = topFoods.length > 0 ? topFoods : favorites.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarBox}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#c4b5fd" size="large" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <View style={styles.userHeader}>
              <Text style={styles.nameText}>
                {user?.username ?? USERNAME}
              </Text>
              <Text style={styles.uuidText}>
                {user?.user_uuid ?? "User ID loading..."}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <StatCard label="Favorites" value={String(favoriteCount)} />
              <StatCard
                label="Top Hall"
                value={
                  topDiningHall
                    ? diningHallLabels[topDiningHall.name as DiningHall]
                    : "None"
                }
              />
              <StatCard
                label="Top Meal"
                value={
                  topMealPeriod
                    ? mealPeriodLabels[topMealPeriod.name as MealPeriod]
                    : "None"
                }
              />
            </View>

            <Section title="Recent Favorites">
              {recentFavorites.length > 0 ? (
                recentFavorites.map((food) => (
                  <FoodLine key={`${food.food_uuid}-${food.dining_hall}`} food={food} />
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No favorites yet. Submit a food or tap a heart.
                </Text>
              )}
            </Section>

            <Section title="Favorite Dining Halls">
              {topDiningHalls.length > 0 ? (
                topDiningHalls.map((hall) => (
                  <Text key={hall.name} style={styles.cardText}>
                    {diningHallLabels[hall.name as DiningHall]} — {hall.count} favorite
                    {hall.count === 1 ? "" : "s"}
                  </Text>
                ))
              ) : (
                <Text style={styles.emptyText}>No dining hall data yet.</Text>
              )}
            </Section>

            <Section title="Favorite Meal Periods">
              {topMealPeriods.length > 0 ? (
                topMealPeriods.map((period) => (
                  <Text key={period.name} style={styles.cardText}>
                    {mealPeriodLabels[period.name as MealPeriod]} — {period.count} favorite
                    {period.count === 1 ? "" : "s"}
                  </Text>
                ))
              ) : (
                <Text style={styles.emptyText}>No meal period data yet.</Text>
              )}
            </Section>

            <Section title="Recommended Dishes">
              {recommendedDishes.length > 0 ? (
                recommendedDishes.map((food) => (
                  <FoodLine key={`recommended-${food.food_uuid}-${food.dining_hall}`} food={food} />
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Recommendations will appear after you favorite foods.
                </Text>
              )}
            </Section>

            <TouchableOpacity style={styles.refreshButton} onPress={loadProfileData}>
              <Ionicons name="refresh" size={18} color="#111827" />
              <Text style={styles.refreshButtonText}>Refresh Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FoodLine({ food }: { food: FavoriteFood }) {
  return (
    <View style={styles.foodLine}>
      <View style={styles.foodIcon}>
        <Ionicons name="heart" size={15} color="#7c3aed" />
      </View>

      <View style={styles.foodInfo}>
        <Text style={styles.cardText}>{food.food_name}</Text>
        <Text style={styles.cardSubtext}>
          {mealPeriodLabels[food.meal_period]} ·{" "}
          {diningHallLabels[food.dining_hall]} · {food.users_liked_count} likes
        </Text>
      </View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  container: {
    padding: 22,
    paddingBottom: 40,
  },

  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 26,
  },

  avatarBox: {
    width: 150,
    height: 150,
    borderRadius: 30,
    backgroundColor: "#f8fafc",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  avatarIcon: {
    fontSize: 86,
  },

  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },

  loadingText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },

  userHeader: {
    alignItems: "center",
    marginBottom: 22,
  },

  nameText: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "900",
  },

  uuidText: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 6,
  },

  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
  },

  statValue: {
    color: "#c4b5fd",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  statLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 18,
  },

  foodLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  foodIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  foodInfo: {
    flex: 1,
  },

  cardText: {
    color: "#020617",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 3,
  },

  cardSubtext: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "700",
  },

  refreshButton: {
    backgroundColor: "#c4b5fd",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  refreshButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
});