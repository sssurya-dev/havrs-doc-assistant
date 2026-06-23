import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  return (
    <nav style={{
      background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        fontWeight: 800,
        fontSize: '1.4rem',
        color: 'var(--text)',
        textDecoration: 'none',
        letterSpacing: '-0.03em',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}>
        havrs<span style={{ color: 'var(--accent)', fontSize: '1.5rem', lineHeight: 1 }}>.</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {[
          { to: '/', label: 'Upload' },
          { to: '/documents', label: 'Documents' },
        ].map(({ to, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              style={{
                textDecoration: 'none',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: active ? 600 : 500,
                fontSize: '0.875rem',
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius)',
                background: active ? 'var(--primary-faint)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'var(--bg)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}