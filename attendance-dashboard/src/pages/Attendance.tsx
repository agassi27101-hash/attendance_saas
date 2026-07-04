import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { 
  Search, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw 
} from 'lucide-react';

interface AttendanceLog {
  id: number;
  user_id: number;
  employee_name: string;
  date: string;
  mark_in_time: string | null;
  mark_out_time: string | null;
  status: 'present' | 'late' | 'half_day' | 'absent';
  zone_name: string | null;
  total_hours: number | null;
  department: string | null;
}

export const Attendance: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Build API query parameters
      let url = '/attendance/company-logs';
      const params: string[] = [];
      if (dateFilter) params.push(`date=${dateFilter}`);
      if (deptFilter) params.push(`department=${encodeURIComponent(deptFilter)}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await api.get<AttendanceLog[]>(url);
      setLogs(response.data);
    } catch {
      showToast('Failed to load attendance logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateFilter, deptFilter]);

  const handleRefresh = () => {
    fetchLogs();
    showToast('Logs updated successfully.', 'success');
  };

  // Client-side filtering by Employee Name/Code
  const filteredLogs = logs.filter((log) => {
    return log.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case 'present':
        return 'pill-teal';
      case 'late':
      case 'half_day':
        return 'pill-amber';
      case 'absent':
        return 'pill-coral';
      default:
        return 'pill-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'late':
        return 'Late';
      case 'half_day':
        return 'Half Day';
      case 'absent':
        return 'Absent';
      default:
        return status.toUpperCase();
    }
  };

  const formatTime = (isoString: string | null | undefined): string => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('No logs available to export.', 'error');
      return;
    }

    const headers = [
      'Employee Name',
      'Department',
      'Date',
      'Mark In Time',
      'Mark In Zone',
      'Mark Out Time',
      'Total Hours',
      'Status'
    ];

    const csvRows = [
      headers.join(','), // Header row
      ...filteredLogs.map((log) => [
        `"${log.employee_name}"`,
        `"${log.department || 'N/A'}"`,
        `"${log.date}"`,
        `"${formatTime(log.mark_in_time)}"`,
        `"${log.zone_name || 'N/A'}"`,
        `"${formatTime(log.mark_out_time)}"`,
        `"${log.total_hours != null ? log.total_hours.toFixed(2) : '0.00'}"`,
        `"${getStatusLabel(log.status)}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Logs_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded!', 'success');
  };

  // Get distinct departments from logs for the dropdown filter list
  const departments = ['Engineering', 'HR', 'Sales', 'Design', 'Marketing', 'Finance'];

  return (
    <div>
      {/* Search and Filters Strip */}
      <div className="card" style={styles.filtersCard}>
        <div style={styles.filterSection}>
          <div style={styles.inputWrapper}>
            <Search size={16} style={styles.inputIcon} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px', minWidth: '220px' }}
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={styles.inputWrapper}>
            <Calendar size={16} style={styles.inputIcon} />
            <input
              type="date"
              className="form-control"
              style={{ paddingLeft: '36px', minWidth: '150px' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div style={styles.inputWrapper}>
            <Filter size={16} style={styles.inputIcon} />
            <select
              className="form-control"
              style={{ paddingLeft: '36px', minWidth: '160px' }}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {(dateFilter || deptFilter || searchQuery) && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => {
                setDateFilter('');
                setDeptFilter('');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div style={styles.actionSection}>
          <button className="btn btn-secondary" onClick={handleRefresh} title="Refresh Logs">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={exportToCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={styles.emptyContainer}>Loading company-wide logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={styles.emptyContainer}>No attendance records found matching filters.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Mark-In</th>
                  <th>Geofence Zone</th>
                  <th>Mark-Out</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600 }}>{log.employee_name}</td>
                    <td>{log.department || 'General'}</td>
                    <td className="mono">{formatDate(log.date)}</td>
                    <td className="mono" style={{ fontWeight: 500 }}>
                      {formatTime(log.mark_in_time)}
                    </td>
                    <td>
                      <span className="pill pill-teal" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                        {log.zone_name || 'Chennai HQ'}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 500 }}>
                      {formatTime(log.mark_out_time)}
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {log.total_hours != null ? `${log.total_hours.toFixed(2)} hrs` : '—'}
                    </td>
                    <td>
                      <span className={`pill ${getStatusPillClass(log.status)}`}>
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  filtersCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    padding: '1rem 1.5rem',
  },
  filterSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  actionSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--slate)',
  },
  emptyContainer: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--slate)',
    fontSize: '0.9rem',
  },
};

export default Attendance;
