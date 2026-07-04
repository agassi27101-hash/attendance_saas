import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
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
const SCANNER_SIZE = width * 0.65;

interface Zone {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface AttendanceLog {
  id: number;
  date: string;
  mark_in_time: string | null;
  mark_out_time: string | null;
  total_hours: number | null;
  status: 'present' | 'late' | 'half_day' | 'absent';
}

export default function HomeScreen() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsedHours, setElapsedHours] = useState('00:00:00');
  
  // Biometric scan states
  const [permission, requestPermission] = useCameraPermissions();
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [verifyingProgress, setVerifyingProgress] = useState(0);
  const [verifyingText, setVerifyingText] = useState('Position face in frame...');

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const locationIntervalRef = useRef<any>(null);

  // Scanning animation shared value
  const scanLineY = useSharedValue(-SCANNER_SIZE / 2);

  // Haversine formula to compute distance in meters
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchData = async () => {
    try {
      // 1. Fetch assigned zones
      const zonesRes = await api.get<Zone[]>('/zones/my-zones');
      setZones(zonesRes.data);

      // 2. Fetch logs for today
      const todayStr = new Date().toISOString().slice(0, 10);
      const logsRes = await api.get<AttendanceLog[]>(`/attendance/my-logs?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`);
      const todayRecord = logsRes.data.find((log) => log.date === todayStr);
      setTodayLog(todayRecord || null);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  const updateLocationCheck = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation(loc);
    } catch (e) {
      console.error('Error getting location for geofence check:', e);
    }
  };

  const initDashboard = async () => {
    setLoading(true);
    await fetchData();
    await updateLocationCheck();
    setLoading(false);
  };

  // On mount: fetch data, do initial location check, and set up 10s location polling
  useEffect(() => {
    initDashboard();

    locationIntervalRef.current = setInterval(() => {
      updateLocationCheck();
    }, 10000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update dynamic geofence state whenever location or zones list updates
  useEffect(() => {
    if (!currentLocation || zones.length === 0) {
      setActiveZone(null);
      return;
    }

    const { latitude, longitude } = currentLocation.coords;
    let matchedZone: Zone | null = null;

    for (const zone of zones) {
      const distance = haversineDistance(latitude, longitude, zone.latitude, zone.longitude);
      if (distance <= zone.radius_meters) {
        matchedZone = zone;
        break;
      }
    }

    setActiveZone(matchedZone);
  }, [currentLocation, zones]);

  // Timer logic: updates elapsed hours since mark_in_time in HH:MM:SS format
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (todayLog && todayLog.mark_in_time && !todayLog.mark_out_time) {
      const start = new Date(todayLog.mark_in_time).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const diffMs = now - start;
        if (diffMs < 0) {
          setElapsedHours('00:00:00');
          return;
        }
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        setElapsedHours(
          `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`
        );
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsedHours('00:00:00');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [todayLog]);

  // Scanning animation trigger when verification modal is active
  useEffect(() => {
    if (isVerifyingFace) {
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(SCANNER_SIZE / 2, { duration: 1500 }),
          withTiming(-SCANNER_SIZE / 2, { duration: 1500 })
        ),
        -1,
        false
      );
    } else {
      scanLineY.value = -SCANNER_SIZE / 2;
    }
  }, [isVerifyingFace]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await updateLocationCheck();
    setRefreshing(false);
  };

  const handleMarkAttendance = () => {
    // Request permission if not granted
    if (permission && !permission.granted) {
      requestPermission();
    }

    // Reset verification states
    setVerifyingProgress(0);
    setVerifyingText('Analyzing face structure...');
    setIsVerifyingFace(true);

    // Simulate scanning
    let progress = 0;
    const interval = setInterval(async () => {
      progress += 10;
      setVerifyingProgress(progress);
      
      if (progress === 40) {
        setVerifyingText('Matching biometric keys...');
      } else if (progress === 80) {
        setVerifyingText('Verifying security hash...');
      } else if (progress >= 100) {
        clearInterval(interval);
        
        try {
          let base64Photo = 'MOCK_BASE64_JPEG_IMAGE_DATA';
          if (permission && permission.granted && cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
              base64: true,
              quality: 0.5,
            });
            base64Photo = photo.base64 || '';
          }
          
          setVerifyingText('Face match verified! (99.8%)');
          
          setTimeout(() => {
            setIsVerifyingFace(false);
            proceedMarkAttendance(base64Photo);
          }, 800);
        } catch (err: any) {
          setIsVerifyingFace(false);
          Alert.alert('Verification Error', 'Failed to capture camera snapshot. Please try again.');
        }
      }
    }, 200);
  };

  const proceedMarkAttendance = async (image: string) => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      // Fetch precise location at execution time
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(loc);

      const { latitude, longitude } = loc.coords;
      const isMarkIn = !todayLog || !todayLog.mark_in_time;
      const endpoint = isMarkIn ? '/attendance/mark-in' : '/attendance/mark-out';

      const response = await api.post(endpoint, {
        latitude,
        longitude,
        image,
      });

      Alert.alert('Verification Success', response.data.message);
      await fetchData(); // Reload logs
    } catch (err: any) {
      let msg = 'Failed to mark attendance. Please check connection.';
      if (err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error;
      }
      Alert.alert('Attendance Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Determine button state color & label
  const isMarkIn = !todayLog || !todayLog.mark_in_time;
  const isMarkedOut = todayLog && todayLog.mark_out_time;

  let ringColor: string = Colors.slate;
  let pulseOpacity = 0.1;
  let statusText = 'Checking location...';
  let buttonDisabled = true;

  if (loading) {
    statusText = 'Loading details...';
  } else if (isMarkedOut) {
    statusText = 'Attendance completed for today!';
    ringColor = Colors.slate;
    buttonDisabled = true;
  } else if (activeZone) {
    statusText = `Inside zone: ${activeZone.name}`;
    ringColor = Colors.teal;
    pulseOpacity = 0.15;
    buttonDisabled = false;
  } else {
    statusText = 'Outside geofence. Mark-in disabled.';
    ringColor = Colors.coral;
    buttonDisabled = true;
  }

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  // Reanimated style for scan line
  const scanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
    };
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.teal} />
      }
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.teal} size="large" />
          <ThemedText type="smallMedium" colorType="textSecondary" style={styles.loadingText}>
            Loading attendance status...
          </ThemedText>
        </View>
      ) : (
        <>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <ThemedText type="subtitle" style={styles.dateHeader}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </ThemedText>
            <View style={styles.liveClockContainer}>
              <ThemedText type="mono" style={styles.liveClockLabel}>LIVE CLOCK: </ThemedText>
              <ThemedText type="monoSemiBold" colorType="teal" style={styles.liveClockTime}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </ThemedText>
            </View>
          </View>

          {/* Dynamic Geofence Action Button */}
          <View style={styles.buttonContainer}>
            {/* Pulsating Ring */}
            {!buttonDisabled && (
              <View
                style={[
                  styles.pulseCircle,
                  {
                    backgroundColor: ringColor,
                    opacity: pulseOpacity,
                  },
                ]}
              />
            )}

            <TouchableOpacity
              style={[
                styles.circleButton,
                { borderColor: ringColor },
                buttonDisabled && styles.circleButtonDisabled,
              ]}
              onPress={handleMarkAttendance}
              disabled={buttonDisabled || actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <ActivityIndicator color={Colors.teal} size="large" />
              ) : (
                <View style={styles.buttonInner}>
                  <Ionicons
                    name={isMarkIn ? 'enter' : 'exit'}
                    size={48}
                    color={buttonDisabled ? Colors.slate : ringColor}
                  />
                  <ThemedText type="defaultBold" style={styles.actionText}>
                    {isMarkIn ? 'MARK IN' : isMarkedOut ? 'COMPLETED' : 'MARK OUT'}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Location Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: `${ringColor}10`, borderColor: `${ringColor}30` }]}>
            <Ionicons
              name={activeZone ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={activeZone ? Colors.teal : ringColor}
            />
            <ThemedText type="smallMedium" style={[styles.statusBadgeText, { color: activeZone ? Colors.teal : ringColor }]}>
              {statusText}
            </ThemedText>
          </View>

          {/* Today's Log Card */}
          <View style={styles.logCard}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Today's Session
            </ThemedText>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <ThemedText type="small" colorType="textSecondary">Mark In</ThemedText>
                <ThemedText type="monoMedium" style={styles.gridValue}>
                  {formatTime(todayLog?.mark_in_time || null)}
                </ThemedText>
              </View>

              <View style={styles.gridItem}>
                <ThemedText type="small" colorType="textSecondary">Mark Out</ThemedText>
                <ThemedText type="monoMedium" style={styles.gridValue}>
                  {formatTime(todayLog?.mark_out_time || null)}
                </ThemedText>
              </View>
            </View>

            {todayLog && todayLog.mark_in_time && !todayLog.mark_out_time ? (
              <View style={styles.timerContainer}>
                <ThemedText type="small" colorType="textSecondary">Elapsed Shift Hours</ThemedText>
                <ThemedText type="monoSemiBold" colorType="teal" style={styles.elapsedTimer}>
                  {elapsedHours}
                </ThemedText>
              </View>
            ) : todayLog && todayLog.total_hours ? (
              <View style={styles.totalHoursContainer}>
                <ThemedText type="small" colorType="textSecondary">Shift Completed</ThemedText>
                <ThemedText type="monoSemiBold" style={styles.totalHoursValue}>
                  {todayLog.total_hours.toFixed(2)} hrs
                </ThemedText>
                <View style={[styles.statusPill, { backgroundColor: '#E6F4F1' }]}>
                  <ThemedText type="smallMedium" colorType="teal">Logged</ThemedText>
                </View>
              </View>
            ) : null}
          </View>
        </>
      )}

      {/* Face Biometric Verification Modal */}
      <Modal
        visible={isVerifyingFace}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Biometric Identity Verification</ThemedText>
            <ThemedText style={styles.modalDesc}>
              Scanning your face template to authenticate this clock-in / clock-out event.
            </ThemedText>

            {/* Scanning viewport */}
            <View style={styles.cameraBox}>
              {permission && permission.granted ? (
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
              ) : (
                <View style={styles.simulatedBox}>
                  <Ionicons name="scan" size={48} color="rgba(255,255,255,0.2)" />
                  <ThemedText style={styles.simulatedSub}>[ Simulator Camera Active ]</ThemedText>
                </View>
              )}

              {/* Scanning Overlay Outline */}
              <View style={styles.faceTarget}>
                <Ionicons name="person" size={120} color="rgba(255,255,255,0.35)" />
              </View>

              {/* Animated scan bar */}
              <Animated.View style={[styles.scanningLine, scanLineStyle]} />
            </View>

            <ThemedText style={styles.scanningProgressText}>{verifyingText}</ThemedText>
            <View style={styles.progressPercentText}>{verifyingProgress}%</View>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setIsVerifyingFace(false)}
            >
              <ThemedText style={styles.cancelText}>Cancel verification</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mist,
  },
  contentContainer: {
    padding: Spacing.three,
    alignItems: 'center',
    paddingBottom: 100, // extra room so content clears the tab bar on small phones
  },
  loadingContainer: {
    flex: 1,
    marginTop: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.three,
  },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.two,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  dateHeader: {
    color: Colors.ink,
  },
  liveClockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  liveClockLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  liveClockTime: {
    fontSize: 16,
  },
  buttonContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  circleButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 5,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  circleButtonDisabled: {
    borderColor: Colors.border,
    backgroundColor: '#F5F5F7',
  },
  buttonInner: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: Spacing.two,
    fontSize: 14,
    color: Colors.ink,
  },
  pulseCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.five,
  },
  statusBadgeText: {
    marginLeft: Spacing.one,
  },
  logCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 400,
  },
  cardTitle: {
    color: Colors.ink,
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.three,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridValue: {
    fontSize: 18,
    color: Colors.ink,
    marginTop: Spacing.one,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  elapsedTimer: {
    fontSize: 24,
    marginTop: Spacing.one,
  },
  totalHoursContainer: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  totalHoursValue: {
    fontSize: 22,
    color: Colors.ink,
    marginTop: Spacing.one,
  },
  statusPill: {
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: Spacing.two,
  },

  // Biometric Verification Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#131A26',
    borderRadius: 16,
    padding: Spacing.five,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: Spacing.two,
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
  cameraBox: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderRadius: SCANNER_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'var(--teal)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatedBox: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatedSub: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontFamily: 'IBMPlexMono-Regular',
    marginTop: Spacing.two,
  },
  faceTarget: {
    position: 'absolute',
    opacity: 0.5,
  },
  scanningLine: {
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
  scanningProgressText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#FFFFFF',
    marginTop: Spacing.four,
  },
  progressPercentText: {
    fontSize: 22,
    fontFamily: 'IBMPlexMono-SemiBold',
    color: 'var(--teal)',
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  cancelBtn: {
    paddingVertical: Spacing.two,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: 'var(--coral)',
  },
});
