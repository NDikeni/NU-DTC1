import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const API_URL = "http://10.105.51.175:5000";
const USERNAME = "jeongwoo";

const DINING_HALLS = [
  "ALLISON",
  "SARGE",
  "ELDER",
  "PLEX-EAST",
  "PLEX-WEST",
] as const;

const MEAL_PERIODS = ["BREAKFAST", "LUNCH", "DINNER"] as const;

type DiningHall = (typeof DINING_HALLS)[number];
type MealPeriod = (typeof MEAL_PERIODS)[number];

type PickedPhoto = {
  uri: string;
  fileName: string;
  mimeType: string;
};

type User = {
  username: string;
  user_uuid: string;
};

type UploadedFood = {
  food_uuid: string;
  food_name: string;
  meal_period: MealPeriod;
  dining_hall?: DiningHall;
  dining_halls?: DiningHall[];
  users_liked_count: number;
  s3_bucket_id?: string | null;
};

export default function FavoriteFoodScreen() {
  const [foodName, setFoodName] = useState("");
  const [selectedHall, setSelectedHall] = useState<DiningHall>("ALLISON");
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>("LUNCH");
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizePickedImage = (
    asset: ImagePicker.ImagePickerAsset
  ): PickedPhoto => {
    const fallbackFileName = `food-photo-${Date.now()}.jpg`;
    const fileName = asset.fileName ?? fallbackFileName;

    const extension = fileName.includes(".")
      ? fileName.split(".").pop()?.toLowerCase()
      : "jpg";

    const mimeType =
      asset.mimeType ??
      (extension === "png"
        ? "image/png"
        : extension === "webp"
        ? "image/webp"
        : "image/jpeg");

    return {
      uri: asset.uri,
      fileName,
      mimeType,
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

  const favoriteUploadedFood = async (
    userUuid: string,
    foodUuid: string,
    diningHall: DiningHall
  ) => {
    const response = await fetch(`${API_URL}/users/${userUuid}/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        food_uuid: foodUuid,
        dining_hall: diningHall,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "failed to favorite uploaded food");
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhoto(normalizePickedImage(result.assets[0]));
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhoto(normalizePickedImage(result.assets[0]));
    }
  };

  const submitFavorite = async () => {
    const trimmedFoodName = foodName.trim();

    if (!trimmedFoodName) {
      Alert.alert("Missing food name", "Please enter the food name.");
      return;
    }

    try {
      setIsSubmitting(true);

      const currentUser = await createOrGetUser();

      const formData = new FormData();

      formData.append("username", USERNAME);
      formData.append("food_name", trimmedFoodName);
      formData.append("meal_period", mealPeriod);
      formData.append("dining_halls", JSON.stringify([selectedHall]));

      if (photo !== null) {
        formData.append("image", {
          uri: photo.uri,
          name: photo.fileName,
          type: photo.mimeType,
        } as any);
      }

      const response = await fetch(`${API_URL}/foods/upload`, {
        method: "POST",
        body: formData,
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        Alert.alert(
          "Upload failed",
          data?.error ?? `Server returned status ${response.status}`
        );
        return;
      }

      const uploadedFood: UploadedFood | undefined = data?.food;

      if (uploadedFood?.food_uuid !== undefined) {
        await favoriteUploadedFood(
          currentUser.user_uuid,
          uploadedFood.food_uuid,
          selectedHall
        );
      }

      setFoodName("");
      setSelectedHall("ALLISON");
      setMealPeriod("LUNCH");
      setPhoto(null);

      Alert.alert("Saved", "Favorite food submitted.", [
        {
          text: "OK",
          onPress: () => router.replace("/")
        },
      ]);
    } catch (err) {
      console.log("submitFavorite error:", err);

      Alert.alert(
        "Network error",
        "Could not submit this food. Make sure Flask is running and your backend is reachable."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Favorite Food</Text>

        <Text style={styles.label}>Food name</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Chicken Tikka Masala"
          placeholderTextColor="#64748b"
          value={foodName}
          onChangeText={setFoodName}
        />

        <Text style={styles.label}>Dining hall</Text>
        <View style={styles.optionGrid}>
          {DINING_HALLS.map((hall) => (
            <TouchableOpacity
              key={hall}
              style={[
                styles.optionButton,
                selectedHall === hall && styles.optionSelected,
              ]}
              onPress={() => setSelectedHall(hall)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedHall === hall && styles.optionTextSelected,
                ]}
              >
                {hall}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Meal period</Text>
        <View style={styles.optionGrid}>
          {MEAL_PERIODS.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.optionButton,
                mealPeriod === period && styles.optionSelected,
              ]}
              onPress={() => setMealPeriod(period)}
            >
              <Text
                style={[
                  styles.optionText,
                  mealPeriod === period && styles.optionTextSelected,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Optional photo</Text>

        <View style={styles.photoButtonContainer}>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Ionicons name="image" size={22} color="#111827" />
            <Text style={styles.photoButtonText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Ionicons name="camera" size={22} color="#111827" />
            <Text style={styles.photoButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {photo !== null && (
          <View>
            <Image source={{ uri: photo.uri }} style={styles.previewImage} />

            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() => setPhoto(null)}
            >
              <Ionicons name="trash-outline" size={18} color="#f8fafc" />
              <Text style={styles.removePhotoText}>Remove photo</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={submitFavorite}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#f8fafc" />
          ) : (
            <Text style={styles.submitText}>Submit Favorite</Text>
          )}
        </TouchableOpacity>
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
    padding: 22,
    paddingTop: 50,
    paddingBottom: 120,
  },

  title: {
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 28,
  },

  label: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 18,
  },

  input: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    color: "#f8fafc",
    fontSize: 16,
  },

  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  optionButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  optionSelected: {
    backgroundColor: "#c4b5fd",
    borderColor: "#c4b5fd",
  },

  optionText: {
    color: "#cbd5e1",
    fontWeight: "800",
  },

  optionTextSelected: {
    color: "#111827",
  },

  photoButtonContainer: {
    flexDirection: "row",
    gap: 12,
  },

  photoButton: {
    backgroundColor: "#c4b5fd",
    borderRadius: 18,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  photoButtonText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 16,
  },

  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 22,
    marginTop: 16,
  },

  removePhotoButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  removePhotoText: {
    color: "#f8fafc",
    fontWeight: "800",
  },

  submitButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitText: {
    color: "#f8fafc",
    fontWeight: "900",
    fontSize: 17,
  },
});