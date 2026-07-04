import React, { useState } from 'react';

interface EmployeeWithAttendance {
  id: number;
  name: string;
  employee_code: string;
  department: string;
  status: 'active' | 'inactive';
  attendance?: {
    mark_in_time: string | null;
    mark_out_time: string | null;
    status: 'present' | 'late' | 'half_day' | 'absent' | 'pending';
  };
}

interface TodayStripProps {
  employees: EmployeeWithAttendance[];
  loading: boolean;
}

const TodayStrip: React.FC<TodayStripProps> = ({ employees, loading }) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="card" style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Loading check-in activity...</span>
      </div>
    );
  }

  // Filter only active employees
  const activeEmployees = employees.filter((emp) => emp.status === 'active');

  const getStatusColor = (emp: EmployeeWithAttendance) => {
    if (!emp.attendance) return 'transparent';
    switch (emp.attendance.status) {
      case 'present':
        return 'var(--teal)';
      case 'late':
        return 'var(--amber)';
      case 'half_day':
        return 'var(--amber)';
      case 'absent':
        return 'var(--coral)';
      default:
        return 'transparent';
    }
  };

  const getStatusText = (emp: EmployeeWithAttendance) => {
    if (!emp.attendance) return 'Not Checked In';
    switch (emp.attendance.status) {
      case 'present':
        return 'Present (On-Time)';
      case 'late':
        return 'Present (Late)';
      case 'half_day':
        return 'Half-Day';
      case 'absent':
        return 'Absent';
      default:
        return 'Pending';
    }
  };

  const formatTime = (isoString: string | null | undefined): string => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Today's Check-in Stream</span>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, border: '1.5px solid var(--slate)' }} />
            <span>Absent/Pending</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: 'var(--teal)' }} />
            <span>Present</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: 'var(--amber)' }} />
            <span>Late</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: 'var(--coral)' }} />
            <span>Absent (Confirmed)</span>
          </div>
        </div>
      </h3>

      {activeEmployees.length === 0 ? (
        <div style={styles.emptyText}>No active employees configured.</div>
      ) : (
        <div style={styles.stripContainer}>
          {activeEmployees.map((emp) => {
            const hasCheckedIn = !!emp.attendance && emp.attendance.status !== 'absent';
            const color = getStatusColor(emp);
            const isHovered = hoveredId === emp.id;

            return (
              <div
                key={emp.id}
                style={styles.dotWrapper}
                onMouseEnter={() => setHoveredId(emp.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  style={{
                    ...styles.statusDot,
                    backgroundColor: color,
                    border: hasCheckedIn ? 'none' : '1.5px solid var(--slate)',
                    boxShadow: isHovered ? `0 0 8px ${color || 'var(--slate)'}` : 'none',
                  }}
                />
                
                {isHovered && (
                  <div style={styles.tooltip}>
                    <div style={styles.tooltipHeader}>{emp.name}</div>
                    <div style={styles.tooltipRow}>
                      <span style={styles.label}>Code:</span>
                      <span className="mono" style={styles.value}>{emp.employee_code || 'N/A'}</span>
                    </div>
                    <div style={styles.tooltipRow}>
                      <span style={styles.label}>Dept:</span>
                      <span style={styles.value}>{emp.department || 'General'}</span>
                    </div>
                    <div style={styles.tooltipRow}>
                      <span style={styles.label}>Status:</span>
                      <span style={styles.value}>{getStatusText(emp)}</span>
                    </div>
                    <div style={styles.tooltipRow}>
                      <span style={styles.label}>Mark In:</span>
                      <span className="mono" style={styles.value}>
                        {formatTime(emp.attendance?.mark_in_time)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  stripContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.85rem',
    alignItems: 'center',
    padding: '0.25rem 0',
  },
  dotWrapper: {
    position: 'relative',
    cursor: 'pointer',
  },
  statusDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    transition: 'all 0.15s ease-in-out',
  },
  legend: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.75rem',
    color: 'var(--slate)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  tooltip: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--ink)',
    color: '#FFFFFF',
    padding: '0.75rem',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
    width: '180px',
    zIndex: 10,
    fontSize: '0.75rem',
    pointerEvents: 'none',
  },
  tooltipHeader: {
    fontWeight: 'bold',
    fontSize: '0.8rem',
    marginBottom: '0.35rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '0.25rem',
  },
  tooltipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.2rem',
  },
  label: {
    color: 'var(--slate)',
  },
  value: {
    fontWeight: '500',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: 'var(--slate)',
    textAlign: 'center',
    padding: '1rem 0',
  },
};

export default TodayStrip;
