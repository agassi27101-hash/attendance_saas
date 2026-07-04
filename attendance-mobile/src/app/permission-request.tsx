import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useAppStateContext } from './_layout';

export default function PermissionRequestScreen() {
  const { checkPermission } = useAppStateContext();
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<'undetermined' | 'denied'>('undetermined');

  // Check current status on load
  useEffect(() => {
    const checkCurrentStatus = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'denied') {
        setPermissionState('denied');
      }
    };
    checkCurrentStatus();
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      // For Android 12+, we want to request precise location
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      await checkPermission(); // Sync global state
      
      if (status === 'granted') {
        // Redirection will be handled by the root layout's useEffect
      } else {
        setPermissionState('denied');
      }
    } catch (e) {
      console.error('Error requesting location permission:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        {/* Visual Graphic Element (Map Icon / Radar) */}
        <View style={styles.iconContainer}>
          <View style={[styles.pulseCircle, { borderColor: permissionState === 'denied' ? Colors.coral : Colors.teal }]} />
          <View style={[styles.centerCircle, { backgroundColor: permissionState === 'denied' ? Colors.coral : Colors.teal }]}>
            <ThemedText type="subtitle" colorType="white" style={styles.iconLabel}>
              📍
            </ThemedText>
          </View>
        </View>

        <ThemedText type="title" style={styles.title}>
          Location Required
        </ThemedText>

        {permissionState === 'undetermined' ? (
          <>
            <ThemedText type="default" colorType="textSecondary" style={styles.description}>
              We check your location only when you tap **Mark In** or **Mark Out** to confirm you're at your assigned work location.
            </ThemedText>
            
            <ThemedText type="small" colorType="textSecondary" style={styles.subdescription}>
              Foreground-only location access is required. We do not track your location in the background or when the app is closed.
            </ThemedText>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleRequestPermission}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText type="defaultBold" colorType="white">
                  Grant Location Access
                </ThemedText>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ThemedText type="default" colorType="coral" style={styles.description}>
              Location permission has been denied.
            </ThemedText>
            
            <ThemedText type="small" colorType="textSecondary" style={styles.subdescription}>
              Since attendance logs have payroll consequences, you cannot mark in/out without location access. Please enable "Precise Location" in your device settings.
            </ThemedText>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleOpenSettings}
              activeOpacity={0.8}
            >
              <ThemedText type="defaultBold" colorType="white">
                Open Device Settings
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={checkPermission}
              activeOpacity={0.7}
            >
              <ThemedText type="smallMedium" colorType="teal">
                I've enabled it, check again
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  innerContainer: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.five,
  },
  iconContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  centerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 2,
  },
  iconLabel: {
    fontSize: 28,
  },
  pulseCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.4,
    position: 'absolute',
    zIndex: 1,
  },
  title: {
    color: Colors.ink,
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  subdescription: {
    textAlign: 'center',
    marginBottom: Spacing.four,
    opacity: 0.8,
  },
  button: {
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: Colors.teal,
  },
  dangerButton: {
    backgroundColor: Colors.coral,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  retryButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
