import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function index() {
  const [isOnBoarding, setIsOnBoarding] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      const isOnBoarding = await AsyncStorage.getItem("onBoarding");
      if (isOnBoarding) {
        setIsOnBoarding(false);
      }
      setLoading(false);
    };
    checkOnboarding();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <Redirect href={isOnBoarding ? "/(routes)/onBoarding" : "/(routes)/Home"} />
  );
}
