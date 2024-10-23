import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Dimensions,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { scale, verticalScale } from "react-native-size-matters";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import LottieView from "lottie-react-native";

const { width } = Dimensions.get("window");

const AnimatedMicInterface = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  userInput,
  setUserInput,
  handleSendMessage,
}: any) => {
  const [isInitialState, setIsInitialState] = useState(true);
  const micPosition = useRef(new Animated.Value(0)).current;
  const micSize = useRef(new Animated.Value(1)).current;
  const inputOpacity = useRef(new Animated.Value(0)).current;

  const animateMicToCorner = () => {
    setIsInitialState(false);
    Animated.parallel([
      Animated.timing(micPosition, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(micSize, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(inputOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Calculate the final X position based on screen width and component sizes
  const finalXPosition = width - scale(90); // Adjusting for padding and mic size

  const translateX = micPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, finalXPosition],
  });

  const translateY = micPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [verticalScale(-100), 0], // Start from center, move to bottom
  });

  const scaleValue = micSize.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5], // Increased scale for initial state
  });

  const handleMicPress = () => {
    if (isInitialState) {
      animateMicToCorner();
      onStartRecording();
    } else {
      if (isRecording) {
        onStopRecording();
      } else {
        onStartRecording();
      }
    }
  };

  return (
    <View style={styles.container}>
      {!isInitialState && (
        <Animated.View
          style={[
            styles.inputControlsContainer,
            {
              opacity: inputOpacity,
            },
          ]}
        >
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
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.micContainer,
          {
            transform: [{ translateX }, { translateY }, { scale: scaleValue }],
          },
        ]}
      >
        {isRecording ? (
          <TouchableOpacity
            style={styles.recordingButton}
            onPress={handleMicPress}
          >
            <LottieView
              source={require("@/assets/animations/animation.json")}
              autoPlay
              speed={1.3}
              style={styles.recordingAnimation}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
            <FontAwesome
              name="microphone"
              size={isInitialState ? scale(40) : scale(35)}
              color="#2b3356"
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: verticalScale(80),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  inputControlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: verticalScale(50),
    position: "absolute",
    left: scale(20),
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: scale(20),
    paddingHorizontal: scale(15),
    marginRight: scale(60),
    height: "100%",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: scale(16),
    height: "100%",
  },
  micContainer: {
    width: scale(50),
    height: scale(50),
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  micButton: {
    width: scale(50),
    height: scale(50),
    backgroundColor: "#fff",
    borderRadius: scale(25),
    alignItems: "center",
    justifyContent: "center",
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

export default AnimatedMicInterface;

//   <View style={styles.bottomContainer}>
//               <AnimatedMicInterface
//                 isRecording={isRecording}
//                 onStartRecording={startRecording}
//                 onStopRecording={stopRecording}
//                 userInput={userInput}
//                 setUserInput={setUserInput}
//                 handleSendMessage={handleSendMessage}
//               />

//               {AIResponse && (
//                 <View style={styles.controlsContainer}>
//                   <TouchableOpacity onPress={() => sendToGemini(text)}>
//                     <Regenerate />
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     onPress={() => {
//                       Speech.stop();
//                       speakText(text);
//                     }}
//                   >
//                     <Reload />
//                   </TouchableOpacity>
//                 </View>
//               )}
//             </View>
