import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { getUser } from '../services/auth';
import { 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  Send 
} from 'lucide-react';

interface HRUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export const Settings: React.FC = () => {
  const [hrList, setHrList] = useState<HRUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form states
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);

  const currentUser = getUser();
  const { showToast } = useToast();

  const fetchHRUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<HRUser[]>('/employees');
      // Filter only admins and HR managers
      const hrOnly = response.data.filter((emp) => emp.role === 'hr_manager' || emp.role === 'admin');
      setHrList(hrOnly);
    } catch {
      showToast('Failed to load administrators list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRUsers();
  }, []);

  const handleInviteHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !invitePassword) {
      showToast('Please fill in all fields to create an HR user.', 'error');
      return;
    }

    setInviting(true);
    try {
      await api.post('/employees', {
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: 'hr_manager',
        status: 'active'
      });

      showToast('HR manager account created successfully!', 'success');
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      fetchHRUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create HR account.';
      showToast(errorMsg, 'error');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div>
      <div className="grid-cols-2" style={{ gap: '2rem' }}>
        
        {/* Left Card: Company Profile */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="var(--teal)" />
            Company Profile
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1.5rem' }}>
            Operational organization profile configuration. In the MVP model, these coordinates are read-only.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            <div className="form-group">
              <label>Organization Legal Name</label>
              <input
                type="text"
                className="form-control"
                readOnly
                value="Acme Retail Pvt Ltd"
                style={styles.readOnlyInput}
              />
            </div>

            <div className="form-group">
              <label>Corporate Tenant Subdomain</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control mono"
                  readOnly
                  value="acme-retail"
                  style={{ ...styles.readOnlyInput, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                />
                <span style={styles.inputAddon}>.attendancesaas.com</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Registered Office Geofence Core</label>
              <input
                type="text"
                className="form-control mono"
                readOnly
                value="Chennai HQ (13.0418, 80.2341)"
                style={styles.readOnlyInput}
              />
            </div>
          </div>
        </div>

        {/* Right Card: Invite Form */}
        <div className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={18} color="var(--teal)" />
            Add HR Administrator
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1rem' }}>
            Create additional HR manager or administrative accounts with permission to manage geofences and verify payments.
          </p>

          <form onSubmit={handleInviteHR}>
            <div className="form-group">
              <label>Administrator Name</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. John Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Corporate Email Address</label>
              <input
                type="email"
                className="form-control"
                required
                placeholder="e.g. john@acme.example"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Account Password</label>
              <input
                type="password"
                className="form-control"
                required
                placeholder="Minimum 6 characters"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={inviting}>
              <Send size={14} />
              <span>{inviting ? 'Creating Account...' : 'Create HR Account'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* HR Users Listing Card */}
      <div className="card">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="var(--teal)" />
          Active Administrative Accounts
        </h3>

        {loading ? (
          <div style={styles.loader}>Loading administrators...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Permission Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hrList.map((admin) => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight: 600 }}>
                      {admin.name}
                      {currentUser?.email === admin.email && (
                        <span style={styles.currentUserBadge}>You</span>
                      )}
                    </td>
                    <td className="mono">{admin.email}</td>
                    <td>
                      <span className="pill pill-amber" style={{ fontSize: '0.7rem' }}>
                        {admin.role === 'admin' ? 'Super Admin' : 'HR Manager'}
                      </span>
                    </td>
                    <td>
                      <span className="pill pill-teal">
                        {admin.status}
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
  readOnlyInput: {
    backgroundColor: 'var(--mist)',
    cursor: 'not-allowed',
    borderColor: 'var(--border-muted)',
    color: 'var(--slate)',
  },
  inputAddon: {
    backgroundColor: 'var(--border-muted)',
    border: '1px solid var(--border-muted)',
    borderLeft: 'none',
    padding: '0.65rem 0.75rem',
    fontSize: '0.85rem',
    color: 'var(--slate)',
    borderTopRightRadius: '6px',
    borderBottomRightRadius: '6px',
    fontWeight: '500',
  },
  currentUserBadge: {
    fontSize: '0.65rem',
    backgroundColor: 'var(--teal-light)',
    color: 'var(--teal)',
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    marginLeft: '0.5rem',
  },
  loader: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--slate)',
    fontSize: '0.9rem',
  },
};

export default Settings;
