import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
import { deleteToken } from '@/services/auth';
import { useAppStateContext } from '../_layout';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  basic_salary: number;
  joining_date: string | null;
}

interface Zone {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export default function ProfileScreen() {
  const { logout } = useAppStateContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    try {
      const profileRes = await api.get<UserProfile>('/auth/me');
      setProfile(profileRes.data);

      const zonesRes = await api.get<Zone[]>('/zones/my-zones');
      setZones(zonesRes.data);
    } catch (e) {
      console.error('Error fetching profile data:', e);
      Alert.alert('Error', 'Failed to retrieve profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await deleteToken();
          logout(); // Sync root layout auth status
        },
      },
    ]);
  };

  const handleOpenMap = (zone: Zone) => {
    const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${zone.latitude},${zone.longitude}`;
    const label = encodeURIComponent(zone.name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });

    Linking.openURL(url).catch((err) => {
      console.error('Error opening external map:', err);
      Alert.alert('Error', 'Could not open native maps application.');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.teal} size="large" />
        <ThemedText type="smallMedium" colorType="textSecondary" style={styles.loadingText}>
          Loading profile...
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarContainer}>
          <ThemedText type="title" colorType="white" style={styles.avatarText}>
            {profile?.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.profileName}>
          {profile?.name}
        </ThemedText>
        <ThemedText type="smallMedium" colorType="textSecondary" style={styles.profileRole}>
          {profile?.designation || 'Staff Member'} — {profile?.department || 'Operations'}
        </ThemedText>
      </View>

      {/* Profile Info Details Card */}
      <View style={styles.infoCard}>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          Employee Details
        </ThemedText>

        <View style={styles.detailRow}>
          <ThemedText type="small" colorType="textSecondary" style={styles.detailLabel}>
            Employee Code
          </ThemedText>
          <ThemedText type="monoMedium" style={styles.detailValue}>
            {profile?.employee_code || 'EMP-101'}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText type="small" colorType="textSecondary" style={styles.detailLabel}>
            Email Address
          </ThemedText>
          <ThemedText type="defaultMedium" style={styles.detailValue}>
            {profile?.email}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText type="small" colorType="textSecondary" style={styles.detailLabel}>
            Contact Number
          </ThemedText>
          <ThemedText type="defaultMedium" style={styles.detailValue}>
            {profile?.phone || 'Not provided'}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText type="small" colorType="textSecondary" style={styles.detailLabel}>
            Joining Date
          </ThemedText>
          <ThemedText type="monoMedium" style={styles.detailValue}>
            {profile?.joining_date ? new Date(profile.joining_date).toLocaleDateString() : '--/--/----'}
          </ThemedText>
        </View>
      </View>

      {/* Assigned Geofence Zones Card */}
      <View style={styles.infoCard}>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          Assigned Work Zones
        </ThemedText>

        {zones.length === 0 ? (
          <ThemedText type="small" colorType="coral" style={styles.noZonesText}>
            You have no geofenced zones assigned. Please contact HR to be assigned a workspace.
          </ThemedText>
        ) : (
          zones.map((zone) => (
            <View key={zone.id} style={styles.zoneRow}>
              <View style={styles.zoneDetails}>
                <ThemedText type="defaultBold" style={styles.zoneName}>
                  📍 {zone.name}
                </ThemedText>
                <ThemedText type="small" colorType="textSecondary" style={styles.zoneAddress}>
                  {zone.address || 'No address specified'}
                </ThemedText>
                
                {/* Geofence metadata table */}
                <View style={styles.zoneMetadata}>
                  <View style={styles.metaCol}>
                    <ThemedText type="code">LAT: {zone.latitude.toFixed(4)}</ThemedText>
                  </View>
                  <View style={styles.metaCol}>
                    <ThemedText type="code">LNG: {zone.longitude.toFixed(4)}</ThemedText>
                  </View>
                  <View style={styles.metaCol}>
                    <ThemedText type="code">RAD: {zone.radius_meters}m</ThemedText>
                  </View>
                </View>
              </View>

              {/* View on Map Button */}
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => handleOpenMap(zone)}
                activeOpacity={0.7}
              >
                <Ionicons name="map" size={20} color={Colors.teal} />
                <ThemedText type="smallBold" colorType="teal" style={styles.mapButtonText}>
                  Maps
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Logout Action Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={22} color={Colors.white} />
        <ThemedText type="defaultBold" colorType="white" style={styles.logoutText}>
          Sign Out
        </ThemedText>
      </TouchableOpacity>
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.three,
  },
  profileHeaderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatarText: {
    fontSize: 36,
  },
  profileName: {
    color: Colors.ink,
    fontSize: 22,
  },
  profileRole: {
    marginTop: Spacing.half,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  cardTitle: {
    color: Colors.ink,
    marginBottom: Spacing.three,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: 'right',
    color: Colors.ink,
  },
  noZonesText: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  zoneDetails: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  zoneName: {
    fontSize: 16,
    color: Colors.ink,
  },
  zoneAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  zoneMetadata: {
    flexDirection: 'row',
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  metaCol: {
    marginRight: Spacing.one,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.teal}10`,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${Colors.teal}20`,
  },
  mapButtonText: {
    marginLeft: Spacing.one,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: Colors.coral,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  logoutText: {
    marginLeft: Spacing.two,
  },
});
