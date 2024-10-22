import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useRef, useState } from "react";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { scale, verticalScale } from "react-native-size-matters";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import axios from "axios";
import Regenerate from "@/assets/svgs/regenerate";
import Reload from "@/assets/svgs/reload";

export default function HomeScreen() {
  const [AIResponse, setAIResponse] = useState(false);
  const [AISpeaking, setAISpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording>();
  const lottieRef = useRef<LottieView>(null);

  // get microphone access
  const getMicrophonePermission = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();

      if (!granted) {
        Alert.alert(
          "Permission",
          "Please grant microphone permission to continue"
        );
        return false;
      }
      return true;
    } catch (err: any) {
      console.log(err);
      return false;
    }
  };

  const recordingOptions: any = {
    android: {
      extension: ".wav",
      outPutFormat: Audio.AndroidOutputFormat.MPEG_4,
      androidEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: ".wav",
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };

  const startRecording = async () => {
    const hasPermission = await getMicrophonePermission();

    if (!hasPermission) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      setIsRecording(true);

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
    } catch (err: any) {
      console.log("Failed to start Recording", err);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setLoading(true);

      await recording?.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording?.getURI();

      // send audio to whisper API for transcription
      const transcript = await sendAudioToWhisper(uri!);
      console.log("transcript", transcript);
      setText(transcript);
    } catch (err: any) {
      console.log("Failed to stop Recording", err);
      Alert.alert("Error", "Failed to stop recording");
    } finally {
      setLoading(false);
    }
  };

  const sendAudioToWhisper = async (uri: string) => {
    let retries = 3;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
    while (retries > 0) {
      try {
        const formData = new FormData();
        formData.append("file", {
          uri,
          type: "audio/wav",
          name: "recording.wav",
        } as any);
        formData.append("model", "whisper-1");
  
        const response = await axios.post(
          "https://api.openai.com/v1/audio/transcriptions",
          formData,
          {
            headers: {
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        console.log(response.data.text);
        return response.data.text; // return the transcript from the response
      } catch (err: any) {
        if (err.response?.status === 429) {
          retries -= 1;
          console.log(`Rate limited, retrying... (${3 - retries} of 3)`);
          await delay(3000); // wait 3 seconds before retrying
        } else {
          console.log("Failed to send audio to Whisper", err);
          Alert.alert("Error", "Failed to send audio to Whisper");
          return;
        }
      }
    }
    Alert.alert("Error", "Exceeded maximum retry attempts due to rate limiting.");
  };
  

  return (
    <LinearGradient
      colors={["#250152", "#000"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle={"light-content"} />

      {/* Black shadows */}
      <Image
        source={require("@/assets/main/blur.png")}
        style={{
          position: "absolute",
          right: scale(-15),
          top: 0,
          width: scale(240),
        }}
      />
      <Image
        source={require("@/assets/main/purple-blur.png")}
        style={{
          position: "absolute",
          left: scale(-15),
          bottom: verticalScale(100),
          width: scale(210),
        }}
      />

      {/* Back arrow */}
      {AIResponse && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: verticalScale(50),
            left: scale(20),
          }}
          onPress={() => {
            setAIResponse(false), setIsRecording(false), setText("");
          }}
        >
          <AntDesign name="arrowleft" size={scale(20)} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={{ marginTop: verticalScale(-40) }}>
        {loading ? (
          <TouchableOpacity>
            <LottieView
              source={require("@/assets/animations/loading.json")}
              autoPlay
              loop
              speed={1.3}
              style={{ width: scale(270), height: scale(270) }}
            />
          </TouchableOpacity>
        ) : (
          <>
            {!isRecording ? (
              <>
                {AIResponse ? (
                  <View>
                    <LottieView
                      ref={lottieRef}
                      source={require("@/assets/animations/ai-speaking.json")}
                      autoPlay={false}
                      loop={false}
                      style={{ width: scale(250), height: scale(250) }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{
                      width: scale(110),
                      height: scale(110),
                      backgroundColor: "#fff",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: scale(100),
                    }}
                    onPress={startRecording}
                  >
                    <FontAwesome
                      name="microphone"
                      size={scale(50)}
                      color="#2b3356"
                    />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity onPress={stopRecording}>
                <LottieView
                  source={require("@/assets/animations/animation.json")}
                  autoPlay
                  loop
                  speed={1.3}
                  style={{ width: scale(250), height: scale(250) }}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <View
        style={{
          alignItems: "center",
          width: scale(350),
          position: "absolute",
          bottom: verticalScale(90),
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: scale(16),
            width: scale(269),
            textAlign: "center",
            lineHeight: 25,
          }}
        >
          {"Press the microphone to start recording!"}
        </Text>
      </View>

      {AIResponse && (
        <View
          style={{
            position: "absolute",
            bottom: verticalScale(40),
            left: 0,
            paddingHorizontal: scale(30),
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: scale(360),
          }}
        >
          <TouchableOpacity onPress={() => {}}>
            <Regenerate />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Reload />
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#131313",
  },
});
