import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { 
  CreditCard, 
  Settings, 
  Play, 
  Download, 
  RefreshCw 
} from 'lucide-react';

interface PayrollSettings {
  standard_hours_per_day: number;
  late_threshold_minutes: number;
  half_day_threshold_hours: number;
  overtime_rate_multiplier: number;
  pay_cycle_start_day: number;
  expected_start_time: string;
  currency: string;
}

interface Payslip {
  id: number;
  user_id: number;
  employee_name: string;
  month: number;
  year: number;
  basic_salary: number;
  deductions: number;
  net_pay: number;
  status: 'draft' | 'finalized';
  generated_at: string;
}

export const Payroll: React.FC = () => {
  // Settings states
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Payslips states
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(true);

  // Generation states
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const { showToast } = useToast();

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await api.get<PayrollSettings>('/payroll/settings');
      setSettings(response.data);
    } catch {
      showToast('Failed to fetch payroll configurations.', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchPayslips = async () => {
    setPayslipsLoading(true);
    try {
      const response = await api.get<Payslip[]>('/payroll/payslips/company');
      setPayslips(response.data);
    } catch {
      showToast('Failed to retrieve generated payslips.', 'error');
    } finally {
      setPayslipsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPayslips();
  }, []);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    try {
      await api.put('/payroll/settings', settings);
      showToast('Payroll configurations updated!', 'success');
      fetchSettings();
    } catch {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGeneratePayslips = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const response = await api.post('/payroll/generate', {
        month: genMonth,
        year: genYear
      });
      showToast(response.data.message || 'Payslips generated successfully!', 'success');
      fetchPayslips();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to generate payslips.';
      showToast(errorMsg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (id: number, employeeName: string, month: number, year: number) => {
    try {
      const response = await api.get(`/payroll/payslips/${id}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${employeeName.replace(/\s+/g, '_')}_${month}_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Payslip download started.', 'success');
    } catch {
      showToast('Failed to download payslip PDF. Regenerate might be needed.', 'error');
    }
  };

  const getMonthName = (m: number) => {
    const date = new Date(2000, m - 1, 1);
    return date.toLocaleString('en-US', { month: 'long' });
  };

  return (
    <div>
      <div className="grid-cols-2" style={{ gap: '2rem' }}>
        
        {/* Form Column: Payroll Settings */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} color="var(--teal)" />
            Global Payroll Controls
          </h3>

          {settingsLoading ? (
            <div style={styles.loader}>Loading configurations...</div>
          ) : settings ? (
            <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: 0 }}>
                <div className="form-group">
                  <label>Expected Clock-In Time</label>
                  <input
                    type="text"
                    className="form-control mono"
                    placeholder="09:30"
                    value={settings.expected_start_time}
                    onChange={(e) => setSettings({ ...settings, expected_start_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Late Grace Period (mins)</label>
                  <input
                    type="number"
                    className="form-control mono"
                    value={settings.late_threshold_minutes}
                    onChange={(e) => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: 0 }}>
                <div className="form-group">
                  <label>Standard Shift Hours/Day</label>
                  <input
                    type="number"
                    className="form-control mono"
                    value={settings.standard_hours_per_day}
                    onChange={(e) => setSettings({ ...settings, standard_hours_per_day: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Half-Day Threshold (hrs)</label>
                  <input
                    type="number"
                    className="form-control mono"
                    value={settings.half_day_threshold_hours}
                    onChange={(e) => setSettings({ ...settings, half_day_threshold_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: 0 }}>
                <div className="form-group">
                  <label>Overtime Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control mono"
                    value={settings.overtime_rate_multiplier}
                    onChange={(e) => setSettings({ ...settings, overtime_rate_multiplier: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Pay Cycle Start Day</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    className="form-control mono"
                    value={settings.pay_cycle_start_day}
                    onChange={(e) => setSettings({ ...settings, pay_cycle_start_day: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Payroll Currency</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 'auto' }} disabled={savingSettings}>
                {savingSettings ? 'Saving Settings...' : 'Save Configurations'}
              </button>
            </form>
          ) : (
            <div>Configurations not loaded.</div>
          )}
        </div>

        {/* Generator Column: Trigger payslip calculation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} color="var(--teal)" />
            Generate Monthly Payroll
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1.5rem' }}>
            Calculate working days, prorated salaries, and overtime pay parameters for active workers. This creates a downloadable PDF payslip file.
          </p>

          <form onSubmit={handleGeneratePayslips} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="form-group">
              <label>Select Calendar Month</label>
              <select
                className="form-control"
                value={genMonth}
                onChange={(e) => setGenMonth(parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label>Select Fiscal Year</label>
              <select
                className="form-control mono"
                value={genYear}
                onChange={(e) => setGenYear(parseInt(e.target.value))}
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: 'auto', padding: '0.75rem' }} disabled={generating}>
              <Play size={16} />
              <span>{generating ? 'Processing Calculations...' : 'Generate and Finalize Payslips'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Generated Payslips Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Generated Payslips Ledger</h3>
          <button className="btn btn-secondary" onClick={fetchPayslips} title="Reload list">
            <RefreshCw size={14} />
          </button>
        </div>

        {payslipsLoading ? (
          <div style={styles.loader}>Loading payslips ledger...</div>
        ) : payslips.length === 0 ? (
          <div style={styles.emptyText}>No payslips generated for this company yet. Complete the generation form above.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Pay Cycle Period</th>
                  <th>Base Salary</th>
                  <th>Deductions</th>
                  <th>Net Remuneration</th>
                  <th>Billing Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((slip) => (
                  <tr key={slip.id}>
                    <td style={{ fontWeight: 600 }}>{slip.employee_name}</td>
                    <td className="mono">{getMonthName(slip.month)} {slip.year}</td>
                    <td className="mono">₹{slip.basic_salary.toLocaleString()}</td>
                    <td className="mono" style={{ color: 'var(--coral)' }}>-₹{slip.deductions.toLocaleString()}</td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--teal)' }}>
                      ₹{slip.net_pay.toLocaleString()}
                    </td>
                    <td>
                      <span className={`pill ${slip.status === 'finalized' ? 'pill-teal' : 'pill-amber'}`}>
                        {slip.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDownloadPdf(slip.id, slip.employee_name, slip.month, slip.year)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        title="Download PDF Invoice"
                      >
                        <Download size={14} style={{ marginRight: '4px' }} />
                        <span>PDF</span>
                      </button>
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
  loader: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--slate)',
    fontSize: '0.9rem',
  },
  emptyText: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--slate)',
    fontSize: '0.9rem',
  },
};

export default Payroll;
