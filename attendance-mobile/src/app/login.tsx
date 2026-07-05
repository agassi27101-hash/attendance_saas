import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
import { saveToken } from '@/services/auth';
import { useAppStateContext } from './_layout';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { checkAuth } = useAppStateContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Animation values ---
  // Logo entrance
  const logoY = useSharedValue(-80);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);

  // Card entrance
  const cardY = useSharedValue(80);
  const cardOpacity = useSharedValue(0);

  // Floating orb glow
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  // Button shake on error
  const buttonX = useSharedValue(0);

  // Button press scale
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Entrance sequence
    logoY.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 120 }));
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 150 }));

    cardY.value = withDelay(300, withSpring(0, { damping: 18, stiffness: 100 }));
    cardOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    // Pulse glow loop
    glowScale.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(1.25, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    ));
    glowOpacity.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(0.15, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      false
    ));
  }, []);

  const shakeButton = () => {
    buttonX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      shakeButton();
      return;
    }

    setLoading(true);
    setError(null);
    buttonScale.value = withSpring(0.95);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      const { token } = response.data;
      if (token) {
        await saveToken(token);
        await checkAuth();
      } else {
        setError('Invalid response from server.');
        shakeButton();
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to connect to server. Please check your connection.');
      }
      shakeButton();
    } finally {
      setLoading(false);
      buttonScale.value = withSpring(1);
    }
  };

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }, { scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: buttonX.value }, { scale: buttonScale.value }],
  }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>

          {/* Background glow orb */}
          <Animated.View style={[styles.glowOrb, glowStyle]} />

          <View style={styles.innerContainer}>
            {/* Logo / Branding */}
            <Animated.View style={[styles.headerContainer, logoStyle]}>
              <View style={styles.iconWrapper}>
                <Ionicons name="finger-print" size={44} color={Colors.teal} />
              </View>
              <ThemedText type="title" style={styles.title}>
                Attendance SaaS
              </ThemedText>
              <ThemedText type="small" colorType="textSecondary" style={styles.subtitle}>
                EMPLOYEE PORTAL
              </ThemedText>
            </Animated.View>

            {/* Login Card */}
            <Animated.View style={[styles.card, cardStyle]}>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Welcome back 👋
              </ThemedText>
              <ThemedText type="small" colorType="textSecondary" style={styles.cardSubtitle}>
                Sign in to clock in &amp; manage attendance
              </ThemedText>

              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={Colors.coral} />
                  <ThemedText type="small" colorType="coral" style={styles.errorText}>
                    {error}
                  </ThemedText>
                </View>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <ThemedText type="smallMedium" colorType="textSecondary" style={styles.label}>
                  Email Address
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.slate} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="name@company.com"
                    placeholderTextColor={Colors.slate}
                    value={email}
                    onChangeText={(text) => { setEmail(text); setError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <ThemedText type="smallMedium" colorType="textSecondary" style={styles.label}>
                  Password
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.slate} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.slate}
                    value={password}
                    onChangeText={(text) => { setPassword(text); setError(null); }}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Animated.View style={buttonStyle}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <Ionicons name="log-in-outline" size={20} color="#fff" />
                      <ThemedText type="defaultBold" colorType="white" style={styles.buttonText}>
                        Sign In
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.mist,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -height * 0.15,
    left: width / 2 - 180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: Colors.teal,
  },
  innerContainer: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.teal}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    borderColor: `${Colors.teal}30`,
  },
  title: {
    textAlign: 'center',
    color: Colors.ink,
  },
  subtitle: {
    marginTop: Spacing.half,
    letterSpacing: 2,
    fontSize: 11,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
  },
  cardTitle: {
    color: Colors.ink,
    marginBottom: Spacing.half,
  },
  cardSubtitle: {
    marginBottom: Spacing.four,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(180, 67, 47, 0.08)',
    borderColor: 'rgba(180, 67, 47, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    marginBottom: Spacing.one,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(68, 80, 100, 0.2)',
    borderRadius: 10,
    backgroundColor: Colors.mist,
    paddingHorizontal: Spacing.two,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.ink,
  },
  button: {
    backgroundColor: Colors.teal,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
  },
});
