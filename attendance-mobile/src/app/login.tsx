import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
import { saveToken } from '@/services/auth';
import { useAppStateContext } from './_layout';

export default function LoginScreen() {
  const { checkAuth } = useAppStateContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      const { token } = response.data;
      if (token) {
        await saveToken(token);
        await checkAuth(); // Tells root layout to re-evaluate auth status
      } else {
        setError('Invalid response from server.');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to connect to server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <View style={styles.innerContainer}>
            {/* Header / Branding */}
            <View style={styles.headerContainer}>
              <ThemedText type="title" style={styles.title}>
                Attendance SaaS
              </ThemedText>
              <ThemedText type="small" colorType="textSecondary" style={styles.subtitle}>
                Employee Portal
              </ThemedText>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                Sign In
              </ThemedText>

              {error && (
                <View style={styles.errorBanner}>
                  <ThemedText type="small" colorType="coral" style={styles.errorText}>
                    {error}
                  </ThemedText>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <ThemedText type="smallMedium" colorType="textSecondary" style={styles.label}>
                  Email Address
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor={Colors.slate}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <ThemedText type="smallMedium" colorType="textSecondary" style={styles.label}>
                  Password
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.slate}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError(null);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ThemedText type="defaultBold" colorType="white">
                    Sign In
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: Spacing.four,
  },
  innerContainer: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  title: {
    textAlign: 'center',
    color: Colors.ink,
  },
  subtitle: {
    marginTop: Spacing.half,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
  },
  cardTitle: {
    marginBottom: Spacing.four,
    color: Colors.ink,
  },
  errorBanner: {
    backgroundColor: 'rgba(180, 67, 47, 0.08)',
    borderColor: 'rgba(180, 67, 47, 0.2)',
    borderWidth: 1,
    borderRadius: 6,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    marginBottom: Spacing.one,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(68, 80, 100, 0.2)',
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.ink,
  },
  button: {
    backgroundColor: Colors.teal,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

// Import spacing since it was used but not imported
import { Spacing } from '@/constants/theme';
