import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { saveToken, saveUser } from '../services/auth';
import { useToast } from '../components/Toast';
import { Mail, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user } = response.data;
      
      // Verify role is HR Manager or Admin
      if (user.role !== 'hr_manager' && user.role !== 'admin') {
        showToast('Access Denied: Only HR Managers or Admins can access this panel.', 'error');
        setLoading(false);
        return;
      }

      saveToken(token);
      saveUser(user);
      showToast('Welcome back, ' + user.name + '!', 'success');
      navigate('/');
    } catch (err: any) {
      let errMsg = 'Failed to connect to the server.';
      if (err.response && err.response.data && err.response.data.error) {
        errMsg = err.response.data.error;
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'hr' | 'employee') => {
    if (role === 'hr') {
      setEmail('hr@acme.example');
      setPassword('password123');
    } else {
      setEmail('ravi@acme.example');
      setPassword('password123');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.logoIcon}>A</div>
          <h1 style={styles.title}>HR Portal</h1>
          <p style={styles.subtitle}>Enter your credentials to access the console</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div className="form-group">
            <label>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                type="email"
                className="form-control"
                style={styles.inputWithIcon}
                placeholder="hr@acme.example"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password"
                className="form-control"
                style={styles.inputWithIcon}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Console'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>Quick Dev Login</span>
        </div>

        <div style={styles.quickLoginContainer}>
          <button 
            onClick={() => handleQuickLogin('hr')} 
            style={styles.quickBtn}
            disabled={loading}
          >
            Log in as HR Manager
          </button>
          <button 
            onClick={() => handleQuickLogin('employee')} 
            style={{ ...styles.quickBtn, ...styles.quickBtnErr }}
            disabled={loading}
          >
            Log in as Employee (Error test)
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--mist)',
    padding: '1rem',
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border-muted)',
    borderRadius: '8px',
    padding: '2.5rem 2rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'var(--teal)',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.4rem',
    fontFamily: 'var(--font-headings)',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: '1.75rem',
    color: 'var(--ink)',
    fontFamily: 'var(--font-headings)',
    fontWeight: '600',
    marginBottom: '0.35rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--slate)',
    fontWeight: '500',
  },
  form: {
    display: 'block',
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
  inputWithIcon: {
    paddingLeft: '36px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '1.75rem 0 1.25rem 0',
    position: 'relative',
  },
  dividerText: {
    backgroundColor: '#FFFFFF',
    padding: '0 0.75rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--slate)',
    textTransform: 'uppercase',
    zIndex: 2,
  },
  quickLoginContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  quickBtn: {
    backgroundColor: 'var(--teal-light)',
    color: 'var(--teal)',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'var(--font-headings)',
    transition: 'opacity 0.15s ease',
  },
  quickBtnErr: {
    backgroundColor: 'var(--coral-light)',
    color: 'var(--coral)',
  },
};
