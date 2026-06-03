import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

const API_URL = "http://10.105.51.175:5000";
const USERNAME = "jeongwoo";

type MealPeriod = "BREAKFAST" | "LUNCH" | "DINNER";

type DiningHall =
  | "ALLISON"
  | "SARGE"
  | "ELDER"
  | "PLEX-EAST"
  | "PLEX-WEST";

type FoodItem = {
  food_uuid: string;
  food_name: string;
  meal_period: MealPeriod;
  dining_hall: DiningHall;
  users_liked_count: number;
  s3_bucket_id?: string | null;
  is_liked_by_user: boolean;
};

type DiningHallInfo = {
  id: DiningHall;
  displayName: string;
};

type User = {
  username: string;
  user_uuid: string;
};

const diningHalls: DiningHallInfo[] = [
  { id: "ALLISON", displayName: "Allison Dining Commons" },
  { id: "SARGE", displayName: "Sargent Dining Commons" },
  { id: "ELDER", displayName: "Elder Dining Commons" },
  { id: "PLEX-EAST", displayName: "Foster Walker East" },
  { id: "PLEX-WEST", displayName: "Foster Walker West" },
];

const mealPeriodLabels: Record<MealPeriod, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

const fillerMeals: Record<DiningHall, Record<MealPeriod, FoodItem[]>> = {
  ALLISON: {
    BREAKFAST: [
      {
        food_uuid: "filler-allison-breakfast-1",
        food_name: "Scrambled Eggs",
        meal_period: "BREAKFAST",
        dining_hall: "ALLISON",
        users_liked_count: 12,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-allison-breakfast-2",
        food_name: "French Toast",
        meal_period: "BREAKFAST",
        dining_hall: "ALLISON",
        users_liked_count: 8,
        is_liked_by_user: false,
      },
    ],
    LUNCH: [
      {
        food_uuid: "filler-allison-lunch-1",
        food_name: "Pepperoni Pizza",
        meal_period: "LUNCH",
        dining_hall: "ALLISON",
        users_liked_count: 31,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-allison-lunch-2",
        food_name: "Tomato Soup",
        meal_period: "LUNCH",
        dining_hall: "ALLISON",
        users_liked_count: 11,
        is_liked_by_user: false,
      },
    ],
    DINNER: [
      {
        food_uuid: "filler-allison-dinner-1",
        food_name: "Pasta Alfredo",
        meal_period: "DINNER",
        dining_hall: "ALLISON",
        users_liked_count: 18,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-allison-dinner-2",
        food_name: "Teriyaki Salmon",
        meal_period: "DINNER",
        dining_hall: "ALLISON",
        users_liked_count: 21,
        is_liked_by_user: false,
      },
    ],
  },

  SARGE: {
    BREAKFAST: [
      {
        food_uuid: "filler-sarge-breakfast-1",
        food_name: "Hash Browns",
        meal_period: "BREAKFAST",
        dining_hall: "SARGE",
        users_liked_count: 14,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-sarge-breakfast-2",
        food_name: "Pancakes",
        meal_period: "BREAKFAST",
        dining_hall: "SARGE",
        users_liked_count: 17,
        is_liked_by_user: false,
      },
    ],
    LUNCH: [
      {
        food_uuid: "filler-sarge-lunch-1",
        food_name: "Broccoli Beef",
        meal_period: "LUNCH",
        dining_hall: "SARGE",
        users_liked_count: 25,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-sarge-lunch-2",
        food_name: "Chicken Caesar Wrap",
        meal_period: "LUNCH",
        dining_hall: "SARGE",
        users_liked_count: 20,
        is_liked_by_user: false,
      },
    ],
    DINNER: [
      {
        food_uuid: "filler-sarge-dinner-1",
        food_name: "Teriyaki Chicken",
        meal_period: "DINNER",
        dining_hall: "SARGE",
        users_liked_count: 22,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-sarge-dinner-2",
        food_name: "Veggie Stir Fry",
        meal_period: "DINNER",
        dining_hall: "SARGE",
        users_liked_count: 13,
        is_liked_by_user: false,
      },
    ],
  },

  ELDER: {
    BREAKFAST: [
      {
        food_uuid: "filler-elder-breakfast-1",
        food_name: "Greek Yogurt Bowl",
        meal_period: "BREAKFAST",
        dining_hall: "ELDER",
        users_liked_count: 9,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-elder-breakfast-2",
        food_name: "Breakfast Burrito",
        meal_period: "BREAKFAST",
        dining_hall: "ELDER",
        users_liked_count: 16,
        is_liked_by_user: false,
      },
    ],
    LUNCH: [
      {
        food_uuid: "filler-elder-lunch-1",
        food_name: "Turkey Sandwich",
        meal_period: "LUNCH",
        dining_hall: "ELDER",
        users_liked_count: 10,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-elder-lunch-2",
        food_name: "Chicken Noodle Soup",
        meal_period: "LUNCH",
        dining_hall: "ELDER",
        users_liked_count: 15,
        is_liked_by_user: false,
      },
    ],
    DINNER: [
      {
        food_uuid: "filler-elder-dinner-1",
        food_name: "Chicken Tikka Masala",
        meal_period: "DINNER",
        dining_hall: "ELDER",
        users_liked_count: 34,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-elder-dinner-2",
        food_name: "Rice Pilaf",
        meal_period: "DINNER",
        dining_hall: "ELDER",
        users_liked_count: 19,
        is_liked_by_user: false,
      },
    ],
  },

  "PLEX-EAST": {
    BREAKFAST: [
      {
        food_uuid: "filler-plex-east-breakfast-1",
        food_name: "Oatmeal Bowl",
        meal_period: "BREAKFAST",
        dining_hall: "PLEX-EAST",
        users_liked_count: 7,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-plex-east-breakfast-2",
        food_name: "Bagel with Cream Cheese",
        meal_period: "BREAKFAST",
        dining_hall: "PLEX-EAST",
        users_liked_count: 6,
        is_liked_by_user: false,
      },
    ],
    LUNCH: [
      {
        food_uuid: "filler-plex-east-lunch-1",
        food_name: "Grilled Cheese",
        meal_period: "LUNCH",
        dining_hall: "PLEX-EAST",
        users_liked_count: 23,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-plex-east-lunch-2",
        food_name: "Caesar Salad",
        meal_period: "LUNCH",
        dining_hall: "PLEX-EAST",
        users_liked_count: 12,
        is_liked_by_user: false,
      },
    ],
    DINNER: [
      {
        food_uuid: "filler-plex-east-dinner-1",
        food_name: "Beef Tacos",
        meal_period: "DINNER",
        dining_hall: "PLEX-EAST",
        users_liked_count: 26,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-plex-east-dinner-2",
        food_name: "Black Bean Bowl",
        meal_period: "DINNER",
        dining_hall: "PLEX-EAST",
        users_liked_count: 14,
        is_liked_by_user: false,
      },
    ],
  },

  "PLEX-WEST": {
    BREAKFAST: [
      {
        food_uuid: "filler-plex-west-breakfast-1",
        food_name: "Waffles",
        meal_period: "BREAKFAST",
        dining_hall: "PLEX-WEST",
        users_liked_count: 18,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-plex-west-breakfast-2",
        food_name: "Turkey Sausage",
        meal_period: "BREAKFAST",
        dining_hall: "PLEX-WEST",
        users_liked_count: 9,
        is_liked_by_user: false,
      },
    ],
    LUNCH: [
      {
        food_uuid: "filler-plex-west-lunch-1",
        food_name: "Chicken Pesto Sandwich",
        meal_period: "LUNCH",
        dining_hall: "PLEX-WEST",
        users_liked_count: 22,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-plex-west-lunch-2",
        food_name: "Minestrone Soup",
        meal_period: "LUNCH",
        dining_hall: "PLEX-WEST",
        users_liked_count: 8,
        is_liked_by_user: false,
      },
    ],
    DINNER: [
      {
        food_uuid: "filler-plex-west-dinner-1",
        food_name: "Salmon Rice Bowl",
        meal_period: "DINNER",
        dining_hall: "PLEX-WEST",
        users_liked_count: 19,
        is_liked_by_user: false,
      },
      {
        food_uuid: "filler-plex-west-dinner-2",
        food_name: "Mac and Cheese",
        meal_period: "DINNER",
        dining_hall: "PLEX-WEST",
        users_liked_count: 28,
        is_liked_by_user: false,
      },
    ],
  },
};

export default function HomeScreen() {
  const [showFavorites, setShowFavorites] = useState(false);
  const [openHall, setOpenHall] = useState<DiningHall | null>(null);
  const [selectedMealPeriod, setSelectedMealPeriod] =
    useState<MealPeriod>("BREAKFAST");

  const [user, setUser] = useState<User | null>(null);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [likedFoodUuids, setLikedFoodUuids] = useState<string[]>([]);
  const [fillerBackendFoodUuids, setFillerBackendFoodUuids] = useState<
    Record<string, string>
  >({});
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [isUpdatingLike, setIsUpdatingLike] = useState(false);
  const [deletingFavoriteUuid, setDeletingFavoriteUuid] = useState<string | null>(
    null
  );

  const slideAnim = useRef(new Animated.Value(0)).current;

  const normalizeFavorite = (favorite: any): FoodItem => {
    return {
      food_uuid: favorite.food_uuid,
      food_name: favorite.food_name,
      meal_period: favorite.meal_period,
      dining_hall:
        favorite.dining_hall ??
        favorite.dining_hall_name ??
        favorite.dining_halls?.[0],
      users_liked_count: favorite.users_liked_count ?? 0,
      s3_bucket_id: favorite.s3_bucket_id ?? null,
      is_liked_by_user: true,
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
      throw new Error(data.error ?? "failed to create/get user");
    }

    return data.user;
  };

  const getCurrentUser = async (): Promise<User> => {
    if (user !== null) {
      return user;
    }

    const currentUser = await createOrGetUser();
    setUser(currentUser);

    return currentUser;
  };

  const favoriteMatchesFillerFood = (
    favorite: FoodItem,
    fillerFood: FoodItem
  ) => {
    return (
      favorite.food_name === fillerFood.food_name &&
      favorite.meal_period === fillerFood.meal_period &&
      favorite.dining_hall === fillerFood.dining_hall
    );
  };

  const findBackendFavoriteForFillerFood = (fillerFood: FoodItem) => {
    return favoriteFoods.find((favorite) =>
      favoriteMatchesFillerFood(favorite, fillerFood)
    );
  };

  const getAllFillerFoods = () => {
    return diningHalls.flatMap((hall) =>
      (["BREAKFAST", "LUNCH", "DINNER"] as MealPeriod[]).flatMap(
        (period) => fillerMeals[hall.id][period]
      )
    );
  };

  const syncLikedFillerFoodsFromFavorites = (favorites: FoodItem[]) => {
    const nextLikedFoodUuids: string[] = [];
    const nextBackendFoodUuidMap: Record<string, string> = {};

    getAllFillerFoods().forEach((fillerFood) => {
      const matchingFavorite = favorites.find((favorite) =>
        favoriteMatchesFillerFood(favorite, fillerFood)
      );

      if (matchingFavorite !== undefined) {
        nextLikedFoodUuids.push(fillerFood.food_uuid);
        nextBackendFoodUuidMap[fillerFood.food_uuid] =
          matchingFavorite.food_uuid;
      }
    });

    setLikedFoodUuids(nextLikedFoodUuids);
    setFillerBackendFoodUuids(nextBackendFoodUuidMap);
  };

  const fetchFavoriteFoods = async (userUuid: string) => {
    const response = await fetch(`${API_URL}/users/${userUuid}/favorites`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "failed to fetch favorites");
    }

    const favorites: FoodItem[] = (data.favorites ?? []).map(normalizeFavorite);

    setFavoriteFoods(favorites);
    syncLikedFillerFoodsFromFavorites(favorites);

    return favorites;
  };

  const refreshBackendData = async (showSpinner = false) => {
    try {
      if (showSpinner) {
        setIsLoadingFavorites(true);
      }

      const currentUser = await getCurrentUser();
      await fetchFavoriteFoods(currentUser.user_uuid);
    } catch (err) {
      console.log("refreshBackendData error:", err);
    } finally {
      if (showSpinner) {
        setIsLoadingFavorites(false);
      }
    }
  };

  useEffect(() => {
    refreshBackendData(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshBackendData(false);
    }, [])
  );

  const createFoodInBackend = async (food: FoodItem): Promise<FoodItem> => {
    const formData = new FormData();

    formData.append("username", USERNAME);
    formData.append("food_name", food.food_name);
    formData.append("meal_period", food.meal_period);
    formData.append("dining_halls", JSON.stringify([food.dining_hall]));

    const response = await fetch(`${API_URL}/foods/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "failed to create food");
    }

    return normalizeFavorite(data.food);
  };

  const likeFoodInBackend = async (
    currentUser: User,
    backendFood: FoodItem
  ) => {
    const response = await fetch(
      `${API_URL}/users/${currentUser.user_uuid}/favorites`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          food_uuid: backendFood.food_uuid,
          dining_hall: backendFood.dining_hall,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "failed to favorite food");
    }
  };

  const unlikeFoodInBackend = async (
    currentUser: User,
    backendFoodUuid: string,
    diningHall: DiningHall
  ) => {
    const response = await fetch(
      `${API_URL}/users/${currentUser.user_uuid}/favorites`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          food_uuid: backendFoodUuid,
          dining_hall: diningHall,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "failed to unfavorite food");
    }
  };

  const removeFavorite = async (food: FoodItem) => {
    if (deletingFavoriteUuid !== null) {
      return;
    }

    try {
      setDeletingFavoriteUuid(food.food_uuid);

      const currentUser = await getCurrentUser();

      setFavoriteFoods((currentFavorites) =>
        currentFavorites.filter(
          (favorite) =>
            !(
              favorite.food_uuid === food.food_uuid &&
              favorite.dining_hall === food.dining_hall
            )
        )
      );

      const matchingFillerFood = getAllFillerFoods().find((fillerFood) =>
        favoriteMatchesFillerFood(food, fillerFood)
      );

      if (matchingFillerFood !== undefined) {
        setLikedFoodUuids((currentLikes) =>
          currentLikes.filter((id) => id !== matchingFillerFood.food_uuid)
        );

        setFillerBackendFoodUuids((currentMap) => {
          const nextMap = { ...currentMap };
          delete nextMap[matchingFillerFood.food_uuid];
          return nextMap;
        });
      }

      await unlikeFoodInBackend(
        currentUser,
        food.food_uuid,
        food.dining_hall
      );

      await fetchFavoriteFoods(currentUser.user_uuid);
    } catch (err) {
      console.log("removeFavorite error:", err);

      Alert.alert(
        "Remove failed",
        "Could not remove this food from favorites."
      );

      await refreshBackendData(false);
    } finally {
      setDeletingFavoriteUuid(null);
    }
  };

  const toggleMenu = () => {
    const nextValue = !showFavorites;
    setShowFavorites(nextValue);

    Animated.timing(slideAnim, {
      toValue: nextValue ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();

    if (nextValue) {
      refreshBackendData(true);
    }
  };

  const bubbleLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 101],
  });

  const toggleHallDropdown = (hall: DiningHall) => {
    setOpenHall((currentHall) => (currentHall === hall ? null : hall));
  };

  const getHallDisplayName = (hallId: DiningHall) => {
    return diningHalls.find((hall) => hall.id === hallId)?.displayName ?? hallId;
  };

  const getFoodsForHallAndMeal = (hall: DiningHall, mealPeriod: MealPeriod) => {
    return fillerMeals[hall][mealPeriod];
  };

  const toggleFillerFoodLike = async (food: FoodItem) => {
    if (isUpdatingLike) {
      return;
    }

    const isCurrentlyLiked = likedFoodUuids.includes(food.food_uuid);

    try {
      setIsUpdatingLike(true);

      const currentUser = await getCurrentUser();

      if (isCurrentlyLiked) {
        const backendFoodUuid =
          fillerBackendFoodUuids[food.food_uuid] ??
          findBackendFavoriteForFillerFood(food)?.food_uuid;

        setLikedFoodUuids((currentLikes) =>
          currentLikes.filter((id) => id !== food.food_uuid)
        );

        setFavoriteFoods((currentFavorites) =>
          currentFavorites.filter(
            (favorite) => !favoriteMatchesFillerFood(favorite, food)
          )
        );

        if (backendFoodUuid !== undefined) {
          await unlikeFoodInBackend(
            currentUser,
            backendFoodUuid,
            food.dining_hall
          );
        }

        await fetchFavoriteFoods(currentUser.user_uuid);
        return;
      }

      setLikedFoodUuids((currentLikes) => {
        if (currentLikes.includes(food.food_uuid)) {
          return currentLikes;
        }

        return [...currentLikes, food.food_uuid];
      });

      const createdFood = await createFoodInBackend(food);

      setFillerBackendFoodUuids((currentMap) => ({
        ...currentMap,
        [food.food_uuid]: createdFood.food_uuid,
      }));

      setFavoriteFoods((currentFavorites) => {
        const alreadyExists = currentFavorites.some((favorite) =>
          favoriteMatchesFillerFood(favorite, food)
        );

        if (alreadyExists) {
          return currentFavorites;
        }

        return [
          ...currentFavorites,
          {
            ...createdFood,
            is_liked_by_user: true,
          },
        ];
      });

      await likeFoodInBackend(currentUser, createdFood);
      await fetchFavoriteFoods(currentUser.user_uuid);
    } catch (err) {
      console.log("toggleFillerFoodLike error:", err);

      Alert.alert(
        "Favorite update failed",
        "Could not update this food in the backend."
      );

      await refreshBackendData(false);
    } finally {
      setIsUpdatingLike(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>NU Dining</Text>
            <Text style={styles.subtitle}>Find your next meal</Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/profile")}
          >
            <Ionicons name="person" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {showFavorites ? "Favorites" : "Today's Menu"}
          </Text>

          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={toggleMenu}
            activeOpacity={0.85}
          >
            <Animated.View
              style={[
                styles.toggleCircle,
                {
                  left: bubbleLeft,
                  width: 92,
                },
              ]}
            />

            <View style={styles.toggleTextContainer}>
              <Text
                numberOfLines={1}
                style={[
                  styles.toggleSideText,
                  !showFavorites && styles.toggleSideTextActive,
                ]}
              >
                Today's Menu
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.toggleSideText,
                  showFavorites && styles.toggleSideTextActive,
                ]}
              >
                Favorites
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {!showFavorites ? (
          <View style={styles.hallList}>
            {diningHalls.map((hall) => {
              const isOpen = openHall === hall.id;
              const foodsForSelectedMeal = getFoodsForHallAndMeal(
                hall.id,
                selectedMealPeriod
              );

              return (
                <View key={hall.id} style={styles.hallDropdownCard}>
                  <TouchableOpacity
                    style={styles.hallCard}
                    onPress={() => toggleHallDropdown(hall.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.hallIcon}>
                      <Ionicons
                        name="business-outline"
                        size={22}
                        color="#7c3aed"
                      />
                    </View>

                    <View style={styles.hallInfo}>
                      <Text style={styles.hallText}>{hall.displayName}</Text>
                      <Text style={styles.hallSubtext}>
                        Tap to view breakfast, lunch, and dinner
                      </Text>
                    </View>

                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={22}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.dropdownContent}>
                      <View style={styles.mealPeriodRow}>
                        {(["BREAKFAST", "LUNCH", "DINNER"] as MealPeriod[]).map(
                          (period) => (
                            <TouchableOpacity
                              key={period}
                              style={[
                                styles.mealPeriodButton,
                                selectedMealPeriod === period &&
                                  styles.mealPeriodButtonActive,
                              ]}
                              onPress={() => setSelectedMealPeriod(period)}
                            >
                              <Text
                                style={[
                                  styles.mealPeriodText,
                                  selectedMealPeriod === period &&
                                    styles.mealPeriodTextActive,
                                ]}
                              >
                                {mealPeriodLabels[period]}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>

                      {foodsForSelectedMeal.map((food) => {
                        const liked = likedFoodUuids.includes(food.food_uuid);

                        return (
                          <View key={food.food_uuid} style={styles.mealRow}>
                            <View style={styles.mealInfo}>
                              <Text style={styles.mealName}>
                                {food.food_name}
                              </Text>
                              <Text style={styles.mealSubtext}>
                                {mealPeriodLabels[food.meal_period]} ·{" "}
                                {food.users_liked_count} likes
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.heartButton}
                              onPress={() => toggleFillerFoodLike(food)}
                              disabled={isUpdatingLike}
                            >
                              <Ionicons
                                name={liked ? "heart" : "heart-outline"}
                                size={28}
                                color="#7c3aed"
                              />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.recommendedCard}>
            {isLoadingFavorites ? (
              <View style={styles.favoritesLoadingRow}>
                <ActivityIndicator color="#c4b5fd" />
                <Text style={styles.favoriteSubtext}>Loading favorites...</Text>
              </View>
            ) : favoriteFoods.length > 0 ? (
              favoriteFoods.map((food) => {
                const isDeleting = deletingFavoriteUuid === food.food_uuid;

                return (
                  <View
                    key={`${food.food_uuid}-${food.dining_hall}`}
                    style={styles.foodRow}
                  >
                    <Ionicons name="heart" size={20} color="#c4b5fd" />

                    <View style={styles.favoriteInfo}>
                      <Text style={styles.foodText}>{food.food_name}</Text>
                      <Text style={styles.favoriteSubtext}>
                        {mealPeriodLabels[food.meal_period]} ·{" "}
                        {getHallDisplayName(food.dining_hall)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.removeFavoriteButton}
                      onPress={() => removeFavorite(food)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color="#f8fafc" size="small" />
                      ) : (
                        <Ionicons name="close" size={20} color="#f8fafc" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyFavoritesText}>
                Submit a favorite food from the form or tap a heart.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  container: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },

  header: {
    marginTop: 12,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  appName: {
    color: "#f8fafc",
    fontSize: 32,
    fontWeight: "900",
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 4,
  },

  profileButton: {
    backgroundColor: "#c4b5fd",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    marginTop: 10,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "900",
  },

  toggleContainer: {
    width: 196,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },

  toggleCircle: {
    position: "absolute",
    left: 3,
    width: 92,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#7c3aed",
  },

  toggleTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  toggleSideText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "900",
    zIndex: 10,
    width: "50%",
    textAlign: "center",
  },

  toggleSideTextActive: {
    color: "#f8fafc",
  },

  hallList: {
    gap: 14,
  },

  hallDropdownCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 22,
    overflow: "hidden",
  },

  hallCard: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  hallIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  hallInfo: {
    flex: 1,
  },

  hallText: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },

  hallSubtext: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 3,
  },

  dropdownContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  mealPeriodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  mealPeriodButton: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
  },

  mealPeriodButtonActive: {
    backgroundColor: "#7c3aed",
  },

  mealPeriodText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
  },

  mealPeriodTextActive: {
    color: "#f8fafc",
  },

  mealRow: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  mealInfo: {
    flex: 1,
    paddingRight: 12,
  },

  mealName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },

  mealSubtext: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },

  heartButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  recommendedCard: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
  },

  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },

  favoriteInfo: {
    flex: 1,
  },

  foodText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },

  favoriteSubtext: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },

  emptyFavoritesText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingText: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },

  emptyMenuText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
  },

  favoritesLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  removeFavoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});