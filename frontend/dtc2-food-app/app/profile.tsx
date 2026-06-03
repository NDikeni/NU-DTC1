import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarBox}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>

        <Text style={styles.label}>Name:</Text>

        <Section title="Personal Favorites">
          <Text style={styles.cardText}>Bakery - dessert (2x)</Text>
          <Text style={styles.cardText}>Cheese Quesadilla - comfort (3x)</Text>
          <Text style={styles.cardText}>Waffle Ice cream - station (1x)</Text>
        </Section>

        <Section title="Top Cuisines">
          <Text style={styles.cardText}>Asian</Text>
          <Text style={styles.cardText}>Mediterranean</Text>
        </Section>

        <Section title="Recommended Dishes">
          <Text style={styles.cardText}>Blueberry pancakes</Text>
          <Text style={styles.cardText}>Grilled cheese sandwich</Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 34,
  },
  avatarBox: {
    width: 190,
    height: 190,
    borderRadius: 30,
    backgroundColor: "#f8fafc",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 36,
  },
  avatarIcon: {
    fontSize: 110,
  },
  label: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 18,
  },
  cardText: {
    color: "#020617",
    fontSize: 18,
    marginBottom: 4,
  },
});