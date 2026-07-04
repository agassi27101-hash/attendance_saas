import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

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
  
  const timerRef = useRef<any>(null);
  const locationIntervalRef = useRef<any>(null);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await updateLocationCheck();
    setRefreshing(false);
  };

  const handleMarkAttendance = async () => {
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
      });

      Alert.alert('Success', response.data.message);
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
    ringColor = Colors.slate;
    statusText = 'Shift completed for today';
    buttonDisabled = true;
  } else if (!currentLocation) {
    statusText = 'Unable to get location';
    buttonDisabled = true;
  } else if (zones.length === 0) {
    statusText = 'No assigned work zones';
    buttonDisabled = true;
  } else if (activeZone) {
    ringColor = Colors.teal;
    pulseOpacity = 0.2;
    statusText = `At ${activeZone.name}`;
    buttonDisabled = false;
  } else {
    ringColor = Colors.coral;
    pulseOpacity = 0.15;
    const firstZoneName = zones[0]?.name || 'work zone';
    statusText = `Outside assigned zone. Move closer to ${firstZoneName}.`;
    buttonDisabled = false; // Let them tap it so they can see backend error if they want, or we can enforce it. The prompt says: "If the API rejects for being outside the zone, show the coral error state with the message from the backend"
  }

  // Format times nicely for display
  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
            {/* Background pulsating effect using overlapping absolute circles */}
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

            {todayLog && todayLog.mark_in_time && !todayLog.mark_out_time && (
              <View style={styles.timerContainer}>
                <ThemedText type="small" colorType="textSecondary">Elapsed Hours</ThemedText>
                <ThemedText type="monoSemiBold" colorType="teal" style={styles.elapsedTimer}>
                  {elapsedHours}
                </ThemedText>
              </View>
            )}

            {todayLog?.total_hours && (
              <View style={styles.totalHoursContainer}>
                <ThemedText type="small" colorType="textSecondary">Total Shift Duration</ThemedText>
                <ThemedText type="monoSemiBold" style={styles.totalHoursValue}>
                  {todayLog.total_hours.toFixed(2)} hrs
                </ThemedText>
                {todayLog?.status && (
                  <View style={[styles.statusPill, { backgroundColor: todayLog.status === 'late' ? `${Colors.amber}15` : `${Colors.teal}15` }]}>
                    <ThemedText type="smallBold" style={{ color: todayLog.status === 'late' ? Colors.amber : Colors.teal }}>
                      {todayLog.status.toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mist,
  },
  contentContainer: {
    padding: Spacing.four,
    alignItems: 'center',
    paddingBottom: Spacing.six,
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
    padding: Spacing.three,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: Spacing.four,
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
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.five,
  },
  circleButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
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
    opacity: 0.7,
    borderColor: Colors.slate,
  },
  buttonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    marginTop: Spacing.two,
    fontSize: 16,
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  pulseCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    position: 'absolute',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
    maxWidth: '90%',
  },
  statusBadgeText: {
    marginLeft: Spacing.two,
    textAlign: 'center',
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
});
