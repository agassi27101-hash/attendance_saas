import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  message?: string;
  onDone?: () => void;
}

export default function SuccessOverlay({ visible, message = 'Attendance Marked!', onDone }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const checkScale = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Backdrop fade in
      opacity.value = withTiming(1, { duration: 250 });
      // Circle zoom in
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      // Check icon pops in after circle
      checkScale.value = withDelay(180, withSpring(1, { damping: 10, stiffness: 220 }));
      // Ring pulse out
      ringScale.value = withDelay(200, withTiming(2.2, { duration: 800, easing: Easing.out(Easing.quad) }));
      ringOpacity.value = withDelay(200, withTiming(0, { duration: 800 }));
      // Text fades in
      textOpacity.value = withDelay(350, withTiming(1, { duration: 300 }));

      // Auto-dismiss after 1.5s
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 350 });
        scale.value = withTiming(0.8, { duration: 350 });
        if (onDone) setTimeout(onDone, 350);
      }, 1600);

      return () => clearTimeout(timer);
    } else {
      opacity.value = 0;
      scale.value = 0.5;
      checkScale.value = 0;
      ringScale.value = 0.6;
      ringOpacity.value = 0.8;
      textOpacity.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: (1 - textOpacity.value) * 10 }],
  }));

  if (!visible && opacity.value === 0) return null;

  return (
    <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.content}>
        {/* Expanding ring */}
        <Animated.View style={[styles.ring, ringStyle]} />

        {/* Circle + check */}
        <Animated.View style={[styles.circle, circleStyle]}>
          <Animated.View style={checkStyle}>
            <Ionicons name="checkmark" size={52} color="#fff" />
          </Animated.View>
        </Animated.View>

        {/* Message */}
        <Animated.View style={textStyle}>
          <ThemedText type="subtitle" style={styles.message}>{message}</ThemedText>
          <ThemedText type="small" colorType="textSecondary" style={styles.subMessage}>Attendance recorded successfully</ThemedText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 110, 86, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 22,
  },
  subMessage: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 6,
  },
});
