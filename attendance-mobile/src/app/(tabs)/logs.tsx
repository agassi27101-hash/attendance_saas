import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

interface AttendanceLog {
  id: number;
  date: string;
  mark_in_time: string | null;
  mark_out_time: string | null;
  total_hours: number | null;
  status: 'present' | 'late' | 'half_day' | 'absent';
}

export default function LogsScreen() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchLogs = async (date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const res = await api.get<AttendanceLog[]>(`/attendance/my-logs?month=${month}&year=${year}`);
      setLogs(res.data);
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [selectedDate]);

  const handlePrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return { text: Colors.teal, bg: `${Colors.teal}15` };
      case 'late':
        return { text: Colors.amber, bg: `${Colors.amber}15` };
      case 'half_day':
        return { text: Colors.amber, bg: `${Colors.amber}15` };
      case 'absent':
        return { text: Colors.coral, bg: `${Colors.coral}15` };
      default:
        return { text: Colors.slate, bg: 'rgba(68, 80, 100, 0.1)' };
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    return { day, weekday };
  };

  const renderLogItem = ({ item }: { item: AttendanceLog }) => {
    const { text: textColor, bg: bgColor } = getStatusColor(item.status);
    const { day, weekday } = formatDateLabel(item.date);

    return (
      <View style={styles.logCard}>
        {/* Date block on the left */}
        <View style={styles.dateBlock}>
          <ThemedText type="defaultBold" style={styles.dateDay}>{day}</ThemedText>
          <ThemedText type="small" colorType="textSecondary" style={styles.dateWeekday}>{weekday.toUpperCase()}</ThemedText>
        </View>

        {/* Core Times Block */}
        <View style={styles.timesBlock}>
          <View style={styles.timeRow}>
            <Ionicons name="enter" size={14} color={Colors.teal} />
            <ThemedText type="mono" style={styles.timeText}>
              {' '}In: {formatTime(item.mark_in_time)}
            </ThemedText>
          </View>
          <View style={styles.timeRow}>
            <Ionicons name="exit" size={14} color={Colors.coral} />
            <ThemedText type="mono" style={styles.timeText}>
              {' '}Out: {formatTime(item.mark_out_time)}
            </ThemedText>
          </View>
        </View>

        {/* Total Hours and Status Pill on the right */}
        <View style={styles.statusBlock}>
          {item.total_hours != null ? (
            <ThemedText type="mono" style={styles.hoursText}>
              {item.total_hours.toFixed(1)} hrs
            </ThemedText>
          ) : (
            <ThemedText type="mono" style={styles.hoursText}>-- hrs</ThemedText>
          )}
          <View style={[styles.statusPill, { backgroundColor: bgColor }]}>
            <ThemedText type="smallBold" style={[styles.statusPillText, { color: textColor }]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Month Navigator Header */}
      <View style={styles.navigator}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.teal} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.navLabel}>
          {formatMonthYear(selectedDate)}
        </ThemedText>
        <TouchableOpacity
          onPress={handleNextMonth}
          disabled={selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()}
          style={[
            styles.navButton,
            selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear() && styles.navButtonDisabled,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={24} color={Colors.teal} />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.teal} size="large" />
          <ThemedText type="smallMedium" colorType="textSecondary" style={styles.loadingText}>
            Retrieving logs...
          </ThemedText>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={Colors.slate} style={styles.emptyIcon} />
          <ThemedText type="defaultMedium" colorType="textSecondary" style={styles.emptyText}>
            No attendance logs for this month.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContainer}
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
  navigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.mist,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navLabel: {
    color: Colors.ink,
    fontSize: 18,
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
    paddingBottom: 100,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  dateBlock: {
    width: 55,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingRight: Spacing.two,
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 22,
    color: Colors.ink,
    lineHeight: 24,
  },
  dateWeekday: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  timesBlock: {
    flex: 1,
    paddingLeft: Spacing.three,
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  timeText: {
    fontSize: 14,
    color: Colors.ink,
  },
  statusBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hoursText: {
    fontSize: 14,
    color: Colors.slate,
    marginBottom: Spacing.one,
  },
  statusPill: {
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
