import React from 'react';
import { getUser } from '../services/auth';
import { Calendar, User } from 'lucide-react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const hrUser = getUser();
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header style={styles.header}>
      <h1 style={styles.pageTitle}>{title}</h1>
      
      <div style={styles.rightSection}>
        <div style={styles.dateBadge}>
          <Calendar size={14} style={{ marginRight: '6px', color: 'var(--slate)' }} />
          <span className="mono" style={styles.dateText}>{formattedDate}</span>
        </div>

        <div style={styles.userProfile}>
          <div style={styles.avatar}>
            <User size={16} color="var(--teal)" />
          </div>
          <div>
            <div style={styles.userName}>{hrUser?.name || 'HR Manager'}</div>
            <div style={styles.userRole}>Company Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    height: '70px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid var(--border-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 90,
  },
  pageTitle: {
    fontSize: '1.5rem',
    color: 'var(--ink)',
    fontWeight: '600',
    fontFamily: 'var(--font-headings)',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: 'var(--mist)',
    border: '1px solid var(--border-muted)',
  },
  dateText: {
    fontSize: '0.85rem',
    color: 'var(--slate)',
    fontWeight: '500',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--teal-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--ink)',
    lineHeight: '1.2',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--slate)',
    fontWeight: '500',
  },
};

export default Header;
