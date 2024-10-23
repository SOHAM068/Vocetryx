import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  AppState,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { scale, verticalScale } from "react-native-size-matters";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import axios, { AxiosError } from "axios";
import LottieView from "lottie-react-native";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system";

// Make sure you have these SVG components
import Regenerate from "@/assets/svgs/regenerate";
import Reload from "@/assets/svgs/reload";
import { Volume2, VolumeX } from "lucide-react-native";
import AnimatedMicInterface from "@/components/AnimatedMicInterface";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Audio recording configuration
const RECORDING_OPTIONS = {
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

export default function HomeScreen() {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording>();
  const [AIResponse, setAIResponse] = useState(false);
  const [AISpeaking, setAISpeaking] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const lottieRef = useRef<LottieView>(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);

  useEffect(() => {
    validateApiKeys();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(async () => {
        const status = await recording?.getStatusAsync();
        setRecordingDuration(status?.durationMillis || 0);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (AISpeaking) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [AISpeaking]);

  const validateApiKeys = () => {
    if (!GOOGLE_API_KEY || !GEMINI_API_KEY) {
      Alert.alert(
        "Configuration Error",
        "API keys are not properly configured. Please check your environment setup."
      );
    }
  };

  const getMicrophonePermission = async () => {
    try {
      console.log("Requesting microphone permission...");
      const { granted } = await Audio.requestPermissionsAsync();
      console.log("Microphone permission granted:", granted);

      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Microphone access is required for voice recording"
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      Alert.alert("Error", "Failed to request microphone permission");
      return false;
    }
  };

  const startRecording = async () => {
    const hasPermission = await getMicrophonePermission();
    if (!hasPermission) return;

    try {
      console.log("Starting recording...");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: RECORDING_OPTIONS.android,
        ios: RECORDING_OPTIONS.ios,
        web: {},
      });

      console.log("Recording prepared");
      await newRecording.startAsync();
      console.log("Recording started");

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert(
        "Recording Error",
        "Failed to start recording. Please try again."
      );
    }
  };

  const validateAudioFile = async (uri: string) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log("Audio file validation:", {
        exists: fileInfo.exists,
        size: fileInfo.exists ? fileInfo.size : undefined,
        uri: fileInfo.uri,
      });

      if (!fileInfo.exists) {
        throw new Error("Audio file does not exist");
      }

      if (fileInfo.size === 0) {
        throw new Error("Audio file is empty");
      }

      return true;
    } catch (error) {
      console.error("Audio file validation error:", error);
      return false;
    }
  };

  const convertSpeechToText = async (uri: string): Promise<string> => {
    try {
      console.log("Reading audio file...");
      const audioData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("Audio file read, length:", audioData.length);

      if (!audioData || audioData.length === 0) {
        throw new Error("Audio file is empty");
      }

      const response = await axios.post(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`,
        {
          config: {
            encoding: "LINEAR16",
            sampleRateHertz: 16000,
            languageCode: "en-US",
            model: "default",
            audioChannelCount: 1,
            enableAutomaticPunctuation: true,
            useEnhanced: true,
          },
          audio: {
            content: audioData,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      // console.log('API Response:', JSON.stringify(response.data, null, 2));

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error(
          "No speech detected. Please try speaking more clearly."
        );
      }

      const transcript =
        response.data.results[0]?.alternatives?.[0]?.transcript;
      if (!transcript) {
        throw new Error("Could not transcribe audio. Please try again.");
      }

      return transcript;
    } catch (error) {
      console.error("Speech to text error:", error);

      if (error instanceof AxiosError) {
        console.error("API Error Response:", error.response?.data);

        if (error.response?.status === 400) {
          throw new Error("Invalid audio format. Please try speaking again.");
        } else if (error.response?.status === 401) {
          throw new Error("API key error. Please check configuration.");
        } else if (error.response?.status === 403) {
          throw new Error("Speech-to-Text API not enabled.");
        }
      }
      throw error;
    }
  };

  const sendToGemini = async (text: string): Promise<string> => {
    try {
      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured");
      }

      const updatedChatHistory = [
        ...chatHistory,
        { role: "user", content: text },
      ];

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: updatedChatHistory.map((msg) => ({
            role: msg.role === "user" ? "USER" : "MODEL",
            parts: [{ text: msg.content }],
          })),
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
          generationConfig: {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
            stopSequences: [],
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Properly handle the Gemini API response structure
      if (
        response.data.candidates &&
        response.data.candidates[0]?.content?.parts?.[0]?.text
      ) {
        const aiResponse = response.data.candidates[0].content.parts[0].text;
        setText(aiResponse);
        setLoading(false);
        setAIResponse(true);
        await speakText(aiResponse);

        setChatHistory([
          ...updatedChatHistory,
          { role: "assistant", content: aiResponse },
        ]);

        return aiResponse;
      } else {
        throw new Error("Invalid response format from Gemini API");
      }
    } catch (error) {
      console.error("Gemini API error:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error(
            "API authentication failed. Please check your Gemini API key."
          );
        } else if (error.response?.status === 429) {
          throw new Error("API rate limit exceeded. Please try again later.");
        } else if (error.code === "ECONNABORTED") {
          throw new Error(
            "Request timed out. Please check your internet connection."
          );
        } else if (error.response?.status === 404) {
          throw new Error(
            "Invalid API endpoint. Please check the API configuration."
          );
        }

        // Log detailed error information for debugging
        console.error("Detailed API error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }

      throw new Error("Failed to get AI response. Please try again.");
    }
  };

  // Updated stopRecording function with better error handling and response processing
  const stopRecording = async () => {
    if (!recording) {
      console.log("No recording to stop");
      return;
    }

    try {
      console.log("Stopping recording...");
      setIsRecording(false);
      setLoading(true);

      await recording.stopAndUnloadAsync();
      console.log("Recording stopped");

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) {
        throw new Error("No recording URI available");
      }

      console.log("Recording URI:", uri);

      const isValid = await validateAudioFile(uri);
      if (!isValid) {
        throw new Error("Invalid audio recording");
      }

      const transcribedText = await convertSpeechToText(uri);
      console.log("Transcribed text:", transcribedText);

      if (!transcribedText.trim()) {
        throw new Error(
          "No speech detected. Please try speaking more clearly."
        );
      }

      setText(transcribedText);

      try {
        console.log("Sending to Gemini:", transcribedText);
        const aiResponse = await sendToGemini(transcribedText);

        if (!aiResponse) {
          throw new Error("Empty response from Gemini API");
        }

        console.log("Gemini response:", aiResponse);
        setText(aiResponse);
        setAIResponse(true);
        await speakText(aiResponse);
      } catch (aiError) {
        console.error("AI response error:", aiError);
        Alert.alert(
          "AI Response Error",
          aiError instanceof Error
            ? aiError.message
            : "Failed to get AI response. Please try again."
        );
        setText(transcribedText); // Keep the transcribed text visible
      }
    } catch (error) {
      console.error("Processing error:", error);
      Alert.alert(
        "Processing Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  // Add this type for better type safety
  type GeminiResponse = {
    candidates: Array<{
      content: {
        parts: Array<{
          text: string;
        }>;
      };
    }>;
  };

  useEffect(() => {
    const loadVoices = async () => {
      const voices = await Speech.getAvailableVoicesAsync();
      setAvailableVoices(voices as any);
      // console.log("Available voices:", voices);
    };

    loadVoices();

    return () => {
      // Cleanup speech when component unmounts
      Speech.stop();
    };
  }, []);

  // Add app state listener to handle speech cleanup
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        Speech.stop();
        setAISpeaking(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const [isMuted, setIsMuted] = useState(false);

  // Modified speakText function with male voice selection
  const speakText = async (text: string) => {
    try {
      // Stop any ongoing speech first
      await Speech.stop();

      if (isMuted) {
        return; // Don't speak if muted
      }

      setAISpeaking(true);

      // Select appropriate male voice based on platform
      let voiceOptions = {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
      };

      // if (Platform.OS === "ios") {
      //   // Use Daniel voice for iOS (male voice)
      //   voiceOptions = {
      //     ...voiceOptions,
      //     voice: "com.apple.voice.compact.en-US.Samantha",
      //   };
      // } else {
      //   // For Android, find a male voice
      //   const maleVoice = availableVoices.find(
      //     (voice: Speech.Voice) =>
      //       voice.identifier.includes("male") || voice.name.includes("male")
      //   );
      //   if (maleVoice) {
      //     voiceOptions = {
      //       ...voiceOptions,
      //       voice: maleVoice.identifier,
      //     };
      //   }
      // }

      await Speech.speak(text, {
        ...voiceOptions,
        onDone: () => {
          setAISpeaking(false);
        },
        onError: (error) => {
          console.error("Speech synthesis error:", error);
          setAISpeaking(false);
          Alert.alert("Error", "Failed to synthesize speech");
        },
      });
    } catch (error) {
      console.error("Speech error:", error);
      setAISpeaking(false);
      Alert.alert("Error", "Failed to initialize speech");
    }
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      Speech.stop(); // Stop current speech when muting
      setAISpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  const handleSendMessage = async () => {
    if (userInput.trim() === "") return;

    setLoading(true);
    try {
      const aiResponse = await sendToGemini(userInput);
      setText(aiResponse);
      setAIResponse(true);
      await speakText(aiResponse);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to get AI response. Please try again.");
    } finally {
      setLoading(false);
      setUserInput("");
    }
  };

  const { width, height } = Dimensions.get("window");

  const [showInput, setShowInput] = useState(false);
  const micPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const inputOpacity = useRef(new Animated.Value(0)).current;

  const animateMicToCorner = () => {
    setShowInput(true);
    Animated.parallel([
      Animated.spring(micPosition, {
        toValue: {
          x: width / 2 - scale(85), // Adjust based on your layout
          y: height / 2 - verticalScale(200), // Adjust based on your layout
        },
        useNativeDriver: true,
      }),
      Animated.spring(micScale, {
        toValue: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(inputOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleInitialMicPress = () => {
    animateMicToCorner();
    startRecording();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={["#250152", "#000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />

        <Image
          source={require("@/assets/main/blur.png")}
          style={styles.topBlur}
        />
        <Image
          source={require("@/assets/main/purple-blur.png")}
          style={styles.bottomBlur}
        />

        {AIResponse && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Speech.stop();
              setIsRecording(false);
              setAIResponse(false);
              setText("");
              setAISpeaking(false);
              setChatHistory([]);
              setShowInput(false);
              // Reset animations
              micPosition.setValue({ x: 0, y: 0 });
              micScale.setValue(1);
              inputOpacity.setValue(0);
            }}
          >
            <AntDesign name="arrowleft" size={scale(20)} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.contentContainer}>
          {/* Centered Initial Mic Button */}
          {!showInput && (
            <>
              <TouchableOpacity
                style={styles.initialMicButton}
                onPress={handleInitialMicPress}
              >
                <FontAwesome
                  name="microphone"
                  size={scale(40)}
                  color="#2b3356"
                />
              </TouchableOpacity>
              <Text
                style={{
                  color: "#fff",
                  fontSize: scale(16),
                  width: scale(269),
                  textAlign: "center",
                  lineHeight: 25,
                  marginTop: scale(400), // Added margin to position text below the icon
                }}
              >
                {loading
                  ? "..."
                  : text || "Press the microphone to start recording!"}
              </Text>
            </>
          )}

          {/* Chat Content */}
          {showInput && (
            <>
              <View style={styles.animationContainer}>
                {loading ? (
                  <LottieView
                    source={require("@/assets/animations/loading.json")}
                    autoPlay
                    loop
                    speed={1.3}
                    style={styles.loadingAnimation}
                  />
                ) : (
                  <>
                    {AISpeaking && (
                      <View>
                        <LottieView
                          ref={lottieRef}
                          source={require("@/assets/animations/ai-speaking.json")}
                          autoPlay
                          loop={true}
                          style={styles.aiAnimation}
                        />
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={styles.textContainer}>
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollViewContent}
                  showsVerticalScrollIndicator={false}
                >
                  {chatHistory.map((message, index) => (
                    <View
                      key={index}
                      style={[
                        styles.messageContainer,
                        message.role === "user"
                          ? styles.userMessage
                          : styles.aiMessage,
                      ]}
                    >
                      <Text style={styles.messageText}>{message.content}</Text>
                    </View>
                  ))}
                  {loading && (
                    <Text style={styles.loadingText}>AI is thinking...</Text>
                  )}
                </ScrollView>
              </View>

              <Animated.View
                style={[styles.bottomContainer, { opacity: inputOpacity }]}
              >
                <View style={styles.inputControlsContainer}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={userInput}
                      onChangeText={setUserInput}
                      placeholder="Type your message..."
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={handleSendMessage}
                    >
                      <FontAwesome name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.micContainer}>
                    {isRecording ? (
                      <TouchableOpacity
                        style={styles.recordingButton}
                        onPress={stopRecording}
                      >
                        <LottieView
                          source={require("@/assets/animations/animation.json")}
                          autoPlay
                          speed={1.3}
                          style={styles.recordingAnimation}
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.micButton}
                        onPress={startRecording}
                      >
                        <FontAwesome
                          name="microphone"
                          size={scale(35)}
                          color="#2b3356"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Animated.View>
            </>
          )}
          {AIResponse && (
            <View
              style={{
                position: "absolute",
                top: verticalScale(48),
                left: 0,
                paddingHorizontal: scale(30),
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                width: scale(360),
                gap: 10,
              }}
            >
              <TouchableOpacity onPress={() => sendToGemini(text)}>
                <Regenerate />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleMute}>
                {isMuted ? (
                  <VolumeX size={40} color="#fff" />
                ) : (
                  <Volume2 size={40} color="#fff" strokeWidth={2} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => speakText(text)}>
                <Reload />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#131313",
  },
  topBlur: {
    position: "absolute",
    right: scale(-15),
    top: 0,
    width: scale(240),
  },
  bottomBlur: {
    position: "absolute",
    left: scale(-15),
    bottom: verticalScale(100),
    width: scale(210),
  },
  backButton: {
    position: "absolute",
    top: verticalScale(50),
    left: scale(20),
    zIndex: 1,
  },
  initialMicButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -scale(55) }, { translateY: -scale(100) }],
    width: scale(120),
    height: scale(120),
    backgroundColor: "#fff",
    borderRadius: scale(95),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: verticalScale(20), // Reduced top padding
    width: "100%",
  },
  animationContainer: {
    alignItems: "center",
    height: verticalScale(150), // Reduced height
    justifyContent: "center",
  },
  loadingAnimation: {
    width: scale(200),
    height: scale(200),
  },
  aiAnimation: {
    width: scale(200),
    height: scale(200),
  },
  textContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: scale(15),
    marginTop: verticalScale(10), // Added margin top
    marginBottom: verticalScale(10), // Added margin bottom
  },
  scrollView: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)", // Added subtle background
    borderRadius: scale(20), // Added border radius
    padding: scale(10), // Added padding
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(20),
  },
  messageContainer: {
    borderRadius: scale(15),
    padding: scale(15), // Increased padding
    marginBottom: verticalScale(12), // Increased margin
    maxWidth: "90%", // Increased maximum width
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4a0e4e",
    borderBottomRightRadius: scale(5), // Added chat bubble style
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#2b3356",
    borderBottomLeftRadius: scale(5), // Added chat bubble style
  },
  messageText: {
    color: "#fff",
    fontSize: scale(16),
    lineHeight: scale(24), // Added line height for better readability
  },
  loadingText: {
    color: "#999",
    fontSize: scale(14),
    textAlign: "center",
    marginTop: verticalScale(10),
  },
  bottomContainer: {
    width: "100%",
    paddingBottom: verticalScale(30),
    backgroundColor: "transparent",
  },
  inputControlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    width: "100%",
    justifyContent: "space-between",
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: scale(20),
    paddingHorizontal: scale(15),
    marginRight: scale(10),
    height: verticalScale(50),
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: scale(16),
  },
  micContainer: {
    width: scale(50),
    height: scale(50),
    alignItems: "center",
    justifyContent: "center",
  },
  micButton: {
    width: scale(50),
    height: scale(50),
    backgroundColor: "#fff",
    borderRadius: scale(25),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingButton: {
    width: scale(50),
    height: scale(50),
    alignItems: "center",
    justifyContent: "center",
  },
  recordingAnimation: {
    width: scale(80),
    height: scale(80),
    marginTop: verticalScale(-15),
  },
  sendButton: {
    backgroundColor: "#4a0e4e",
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
  },
});
