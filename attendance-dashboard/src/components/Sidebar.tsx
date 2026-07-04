import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  CalendarCheck, 
  CreditCard, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { deleteToken } from '../services/auth';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    deleteToken();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Zones', path: '/zones', icon: MapPin },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { name: 'Payroll', path: '/payroll', icon: CreditCard },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <div style={styles.logoIcon}>A</div>
        <h2 style={styles.logoText}>Acme HR</h2>
      </div>
      
      <nav style={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={18} 
                  style={{ 
                    marginRight: '12px',
                    color: isActive ? '#FFFFFF' : 'var(--slate)' 
                  }} 
                />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button onClick={handleLogout} style={styles.logoutButton}>
        <LogOut size={18} style={{ marginRight: '12px', color: 'var(--slate)' }} />
        <span>Logout</span>
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 'var(--sidebar-width)',
    backgroundColor: 'var(--ink)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    zIndex: 100,
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2.5rem',
    padding: '0 0.5rem',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'var(--teal)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    fontFamily: 'var(--font-headings)',
    marginRight: '12px',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: '1.25rem',
    fontFamily: 'var(--font-headings)',
    fontWeight: '600',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    color: 'var(--slate)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-headings)',
    fontWeight: '500',
    transition: 'all 0.15s ease',
  },
  navLinkActive: {
    backgroundColor: 'var(--teal)',
    color: '#FFFFFF',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--slate)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-headings)',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'color 0.15s ease',
    marginTop: 'auto',
  },
};

export default Sidebar;
