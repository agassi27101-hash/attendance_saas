import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
import { getToken } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';

interface Payslip {
  id: number;
  month: number;
  year: number;
  net_pay: number;
  status: 'draft' | 'finalized';
  generated_at: string;
}

export default function PayslipsScreen() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchPayslips = async () => {
    try {
      const res = await api.get<Payslip[]>('/payroll/payslips/my-payslips');
      setPayslips(res.data);
    } catch (e) {
      console.error('Error fetching payslips:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayslips();
    setRefreshing(false);
  };

  const handleDownload = async (item: Payslip) => {
    if (downloadingId !== null) return;
    setDownloadingId(item.id);

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const monthName = new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short' });
      const filename = `payslip-${monthName}-${item.year}.pdf`;
      const localUri = `${(FileSystem as any).documentDirectory}${filename}`;

      // Use the base URL configuration from our api helper
      const downloadUrl = `${api.defaults.baseURL}/payroll/payslips/${item.id}/download`;

      console.log(`Downloading payslip from ${downloadUrl} to ${localUri}...`);

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (downloadResult.status !== 200) {
        Alert.alert('Download Failed', 'Could not retrieve PDF file from server. Verify that payslip is finalized.');
        return;
      }

      // Check if sharing is available on the device
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Open Payslip for ${monthName} ${item.year}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `Payslip downloaded to device:\n${downloadResult.uri}`);
      }
    } catch (err: any) {
      console.error('Error downloading payslip:', err);
      Alert.alert('Error', 'An error occurred while downloading the payslip.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatMonthName = (month: number) => {
    return new Date(2026, month - 1, 1).toLocaleDateString(undefined, { month: 'long' });
  };

  const renderPayslipItem = ({ item }: { item: Payslip }) => {
    const isDownloading = downloadingId === item.id;
    const monthName = formatMonthName(item.month);

    return (
      <View style={styles.payslipCard}>
        {/* Document Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={32} color={Colors.teal} />
        </View>

        {/* Content */}
        <View style={styles.detailsContainer}>
          <ThemedText type="defaultBold" style={styles.monthLabel}>
            {monthName} {item.year}
          </ThemedText>
          <ThemedText type="small" colorType="textSecondary" style={styles.generatedLabel}>
            Issued on {new Date(item.generated_at).toLocaleDateString()}
          </ThemedText>
          <ThemedText type="monoSemiBold" colorType="teal" style={styles.amountLabel}>
            INR {item.net_pay.toLocaleString()}
          </ThemedText>
        </View>

        {/* Download Button */}
        <TouchableOpacity
          style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
          onPress={() => handleDownload(item)}
          disabled={isDownloading}
          activeOpacity={0.7}
        >
          {isDownloading ? (
            <ActivityIndicator color={Colors.teal} size="small" />
          ) : (
            <Ionicons name="download-outline" size={24} color={Colors.teal} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.teal} size="large" />
          <ThemedText type="smallMedium" colorType="textSecondary" style={styles.loadingText}>
            Loading payslips...
          </ThemedText>
        </View>
      ) : payslips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={Colors.slate} style={styles.emptyIcon} />
          <ThemedText type="defaultMedium" colorType="textSecondary" style={styles.emptyText}>
            No payslips issued yet.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={payslips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPayslipItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.teal} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mist,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.three,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyIcon: {
    marginBottom: Spacing.three,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: 'center',
  },
  listContainer: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  payslipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: `${Colors.teal}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  detailsContainer: {
    flex: 1,
  },
  monthLabel: {
    color: Colors.ink,
    fontSize: 16,
  },
  generatedLabel: {
    fontSize: 12,
    marginVertical: 2,
  },
  amountLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
});
