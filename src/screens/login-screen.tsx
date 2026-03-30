import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/providers/auth-provider";
import { useAppConfig } from "@/providers/app-config-provider";

const BACKGROUND_GRADIENT = ["#020817", "#071427", "#0a1d33"] as const;
const BUTTON_GRADIENT = ["#1ccfbe", "#16b9c4"] as const;

export function LoginScreen() {
  const { config } = useAppConfig();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const formTranslateY = useRef(new Animated.Value(28)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const primaryGlowDrift = useRef(new Animated.Value(0)).current;
  const secondaryGlowDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        delay: 70,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(primaryGlowDrift, {
            duration: 4800,
            easing: Easing.inOut(Easing.sin),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(primaryGlowDrift, {
            duration: 4800,
            easing: Easing.inOut(Easing.sin),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(secondaryGlowDrift, {
            duration: 5600,
            easing: Easing.inOut(Easing.sin),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(secondaryGlowDrift, {
            duration: 5600,
            easing: Easing.inOut(Easing.sin),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [formTranslateY, introOpacity, primaryGlowDrift, secondaryGlowDrift, titleTranslateY]);

  const primaryGlowStyle = {
    opacity: primaryGlowDrift.interpolate({
      inputRange: [0, 1],
      outputRange: [0.18, 0.34],
    }),
    transform: [
      {
        translateY: primaryGlowDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -18],
        }),
      },
      {
        translateX: primaryGlowDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 10],
        }),
      },
      {
        scale: primaryGlowDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  } as const;

  const secondaryGlowStyle = {
    opacity: secondaryGlowDrift.interpolate({
      inputRange: [0, 1],
      outputRange: [0.12, 0.28],
    }),
    transform: [
      {
        translateY: secondaryGlowDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 16],
        }),
      },
      {
        translateX: secondaryGlowDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        }),
      },
      {
        scale: secondaryGlowDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
  } as const;

  const animateButtonScale = (toValue: number) => {
    Animated.spring(buttonScale, {
      damping: 18,
      mass: 0.7,
      stiffness: 220,
      toValue,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (!config.graphqlApiUrl.trim()) {
      const message = "GraphQL API URL is missing in the shared environment.";
      setSubmitError(message);
      Alert.alert("Missing GraphQL API", message);
      return;
    }

    try {
      setSubmitError(null);
      setSubmitting(true);
      await login(email, password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not sign in.";
      setSubmitError(message);
      Alert.alert("Login failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={BACKGROUND_GRADIENT} style={styles.gradient}>
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, styles.glowPrimary, primaryGlowStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, styles.glowSecondary, secondaryGlowStyle]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.viewport}>
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: introOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            Sign In
          </Animated.Text>

          <Animated.View
            style={[
              styles.form,
              {
                opacity: introOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <View
              style={[
                styles.inputShell,
                focusedField === "email" && styles.inputShellFocused,
              ]}
            >
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={() => setFocusedField((current) => (current === "email" ? null : current))}
                onFocus={() => setFocusedField("email")}
                placeholder="Email"
                placeholderTextColor="rgba(220, 234, 252, 0.46)"
                returnKeyType="next"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View
              style={[
                styles.inputShell,
                focusedField === "password" && styles.inputShellFocused,
              ]}
            >
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() =>
                  setFocusedField((current) => (current === "password" ? null : current))
                }
                onFocus={() => setFocusedField("password")}
                placeholder="Password"
                placeholderTextColor="rgba(220, 234, 252, 0.46)"
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {submitError ? (
              <Text style={styles.errorText}>{submitError}</Text>
            ) : null}

            <Animated.View
              style={[
                styles.buttonWrap,
                submitting && styles.buttonDisabled,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <Pressable
                disabled={submitting}
                onPress={handleLogin}
                onPressIn={() => animateButtonScale(0.965)}
                onPressOut={() => animateButtonScale(1)}
              >
                <LinearGradient colors={BUTTON_GRADIENT} style={styles.button}>
                  {submitting ? (
                    <ActivityIndicator color="#042321" />
                  ) : (
                    <Text style={styles.buttonLabel}>Sign in</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  viewport: {
    alignSelf: "center",
    maxWidth: 390,
    width: "100%",
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.3,
  },
  glowPrimary: {
    backgroundColor: "#13b7c3",
    height: 220,
    right: -40,
    top: 120,
    width: 220,
  },
  glowSecondary: {
    backgroundColor: "#0f766e",
    bottom: 120,
    height: 180,
    left: -40,
    width: 180,
  },
  title: {
    alignSelf: "center",
    color: "#f8fbff",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  form: {
    gap: 16,
    marginTop: 28,
  },
  inputShell: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    minHeight: 58,
    overflow: "hidden",
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.24,
    shadowRadius: 24,
  },
  inputShellFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    transform: [{ translateY: -1 }],
  },
  input: {
    color: "#f8fbff",
    fontSize: 16,
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  errorText: {
    color: "#ff8f8f",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  buttonWrap: {
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#13b7c3",
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.22,
    shadowRadius: 28,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.68,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 18,
  },
  buttonLabel: {
    color: "#042321",
    fontSize: 16,
    fontWeight: "800",
  },
});
