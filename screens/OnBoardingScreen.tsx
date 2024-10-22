import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { scale, verticalScale } from "react-native-size-matters";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { AntDesign } from "@expo/vector-icons";
import { onBoardingData } from "@/config/costants";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OnBoardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayInterval = useRef<NodeJS.Timer | null>(null);

  let [fontsLoaded, fontError] = useFonts({
    SegoeUI: require("../assets/fonts/Segoe-UI.ttf"),
  });
  if (!fontsLoaded && fontError) {
    return null;
  }

  useEffect(() => {
    startAutoPlay();

    // Clear interval when component unmounts
    return () => stopAutoPlay();
  }, [activeIndex]);

  const startAutoPlay = () => {
    if (autoPlayInterval.current) return;

    autoPlayInterval.current = setInterval(() => {
      const nextIndex = activeIndex + 1;
      if (nextIndex < onBoardingData.length) {
        scrollViewRef.current?.scrollTo({
          x: Dimensions.get("window").width * nextIndex,
          animated: true,
        });
        setActiveIndex(nextIndex);
      } else {
        stopAutoPlay();
      }
    }, 9000); // Change slide every 3 seconds
  };

  const stopAutoPlay = () => {
    if (autoPlayInterval.current) {
      clearInterval(autoPlayInterval.current as NodeJS.Timeout);
      autoPlayInterval.current = null;
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffSetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(
      currentOffSetX / event.nativeEvent.layoutMeasurement.width
    );
    setActiveIndex(currentIndex);
  };

  const handleSkip = async () => {
    stopAutoPlay();
    await AsyncStorage.setItem("onBoarding", "true");
    router.push("/(routes)/Home");
  };

  const handleStart = async () => {
    stopAutoPlay();
    await AsyncStorage.setItem("onBoarding", "true");
    router.push("/(routes)/Home"); // Adjust the route as per your main screen
  };

  return (
    <LinearGradient
      colors={["#250152", "#000000"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        onScroll={handleScroll}
        ref={scrollViewRef}
      >
        {onBoardingData.map((item: onBoardingDataType, index: number) => (
          <View key={index} style={styles.slide}>
            {activeIndex !== 2 && (
              <Pressable style={styles.skipContainer} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
                <AntDesign name="arrowright" size={scale(18)} color="white" />
              </Pressable>
            )}
            {item.image}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>

            {activeIndex === 2 && index === 2 && (
              <Pressable style={styles.startButton} onPress={handleStart}>
                <Text style={styles.startButtonText}>Get Started</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.paginationContainer}>
        {onBoardingData.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, { opacity: activeIndex === index ? 1 : 0.3 }]}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slide: {
    width: Dimensions.get("window").width,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: scale(23),
    fontFamily: "SegoeUI",
    textAlign: "center",
    fontWeight: "500",
  },
  subtitle: {
    width: scale(290),
    marginHorizontal: "auto",
    color: "#9A9999",
    fontSize: scale(14),
    fontFamily: "SegoeUI",
    textAlign: "center",
    fontWeight: "400",
    paddingTop: verticalScale(10),
  },
  paginationContainer: {
    position: "absolute",
    bottom: verticalScale(70),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(10),
  },
  dot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#FFFFFF",
    marginHorizontal: scale(4),
    transform: [{ scale: 1 }],
  },
  skipContainer: {
    position: "absolute",
    top: verticalScale(50),
    right: scale(25),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    zIndex: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(15),
  },
  skipText: {
    color: "#fff",
    fontSize: scale(16),
    fontFamily: "SegoeUI",
    fontWeight: "400",
  },
  startButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(50),
    borderRadius: scale(30),
    marginTop: verticalScale(25),
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startButtonText: {
    color: "#fff",
    fontSize: scale(16),
    fontFamily: "SegoeUI",
    textAlign: "center",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

