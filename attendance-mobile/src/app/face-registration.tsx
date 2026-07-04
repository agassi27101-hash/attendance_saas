import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
import { useAppStateContext } from './_layout';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  runOnJS
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const FRAME_SIZE = width * 0.7;

export default function FaceRegistrationScreen() {
  const { checkAuth } = useAppStateContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState<'position' | 'scanning' | 'success'>('position');
  const [isRegistering, setIsRegistering] = useState(false);

  // Reanimated shared values
  const scanLineY = useSharedValue(-FRAME_SIZE / 2);
  const frameScale = useSharedValue(1);

  // Request permission on mount
  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Trigger animation loop during scanning
  useEffect(() => {
    if (scanning) {
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(FRAME_SIZE / 2, { duration: 1500 }),
          withTiming(-FRAME_SIZE / 2, { duration: 1500 })
        ),
        -1, // Infinite repeat
        false
      );
      
      // Simulate progress counter
      let interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            runOnJS(completeScan)();
            return 100;
          }
          return prev + 5;
        });
      }, 150);

      return () => clearInterval(interval);
    } else {
      scanLineY.value = -FRAME_SIZE / 2;
      setScanProgress(0);
    }
  }, [scanning]);

  const startScanning = () => {
    setScanning(true);
    setScanStep('scanning');
    frameScale.value = withTiming(1.05, { duration: 300 });
  };

  const completeScan = async () => {
    setScanning(false);
    frameScale.value = withTiming(1, { duration: 300 });
    setIsRegistering(true);
    setScanStep('success');

    try {
      // Call backend to mark face as registered
      await api.post('/auth/register-face');
      Alert.alert('Success', 'Your face has been registered successfully!', [
        {
          text: 'Get Started',
          onPress: () => {
            checkAuth(); // Updates layout routing to /(tabs)
          }
        }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to register face template. Please try again.');
      setScanStep('position');
    } finally {
      setIsRegistering(false);
    }
  };

  // Styles for Reanimated scanning line
  const scanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
      opacity: scanning ? 1 : 0,
    };
  });

  const frameAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: frameScale.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Biometric Registration</ThemedText>
        <ThemedText style={styles.subtitle}>
          Secure your clock-ins by registering your face template. This step is required on your first login.
        </ThemedText>
      </View>

      <View style={styles.cameraContainer}>
        {permission && permission.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="front">
            <View style={styles.cameraOverlay} />
          </CameraView>
        ) : (
          <View style={styles.simulatedCamera}>
            <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.15)" />
            <ThemedText style={styles.simulatedText}>[ Camera Simulator Active ]</ThemedText>
          </View>
        )}

        {/* Circular Scanning Frame */}
        <Animated.View style={[styles.scanFrame, frameAnimatedStyle]}>
          <View style={styles.faceSilhouette}>
            <Ionicons name="person-outline" size={140} color={scanning ? 'var(--teal)' : 'rgba(255, 255, 255, 0.4)'} />
          </View>

          {/* Reanimated Scan Line */}
          <Animated.View style={[styles.scanLine, scanLineStyle]} />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        {scanStep === 'position' && (
          <>
            <ThemedText style={styles.instructionText}>
              Center your face within the scanner and look straight at the screen.
            </ThemedText>
            <TouchableOpacity style={styles.button} onPress={startScanning}>
              <Ionicons name="scan-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <ThemedText style={styles.buttonText}>Start Scan</ThemedText>
            </TouchableOpacity>
          </>
        )}

        {scanStep === 'scanning' && (
          <View style={styles.progressContainer}>
            <ThemedText style={styles.scanningText}>Scanning Face Template...</ThemedText>
            <ThemedText style={styles.progressPercent}>{scanProgress}%</ThemedText>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${scanProgress}%` }]} />
            </View>
          </View>
        )}

        {scanStep === 'success' && (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color="var(--teal)" />
            <ThemedText style={styles.savingText}>Processing and saving face template...</ThemedText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17', // sleek dark theme background
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  header: {
    marginTop: Spacing.five,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraContainer: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: FRAME_SIZE / 2,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 14, 23, 0.15)',
  },
  simulatedCamera: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatedText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontFamily: 'IBMPlexMono-Regular',
    marginTop: Spacing.two,
  },
  scanFrame: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: 'var(--teal)',
    borderRadius: FRAME_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceSilhouette: {
    opacity: 0.8,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'var(--teal)',
    shadowColor: 'var(--teal)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  footer: {
    marginBottom: Spacing.five,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  button: {
    backgroundColor: 'var(--teal)',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
  },
  progressPercent: {
    fontSize: 28,
    fontFamily: 'IBMPlexMono-Medium',
    color: 'var(--teal)',
    marginBottom: Spacing.three,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--teal)',
  },
  savingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: Spacing.three,
  },
});
