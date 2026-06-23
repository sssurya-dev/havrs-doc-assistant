import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllDocuments } from '../utils/api';

const RISK_CONFIG = {
  high:    { bg: '#fef2f2', badge: '#fee2e2', text: '#dc2626' },
  medium:  { bg: '#fffbeb', badge: '#fef3c7', text: '#d97706' },
  low:     { bg: '#f0fdf4', badge: '#dcfce7', text: '#16a34a' },
};

function RiskBadge({ level }) {
  if (!level) return null;
  const key = level.toLowerCase();
  const cfg = RISK_CONFIG[key] || { badge: '#f1f5f9', text: '#64748b' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: cfg.badge,
      color: cfg.text,
      flexShrink: 0,
    }}>
      {key} risk
    </span>
  );
}

function FileTypeChip({ filename }) {
  const isDocx = filename?.toLowerCase().endsWith('.docx');
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: '5px',
      fontSize: '0.68rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      background: isDocx ? '#ede9fe' : '#e0f2fe',
      color: isDocx ? '#7c3aed' : '#0369a1',
      marginLeft: '0.4rem',
    }}>
      {isDocx ? 'DOCX' : 'PDF'}
    </span>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllDocuments()
      .then((data) => setDocuments(data.documents || []))
      .catch(() => setError('Could not load documents. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '6rem 1.5rem', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
      <p>Loading your documents…</p>
    </div>
  );

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            My Documents
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {documents.length > 0
              ? `${documents.length} document${documents.length !== 1 ? 's' : ''} uploaded`
              : 'No documents yet'}
          </p>
        </div>
        <Link to="/" style={{
          background: 'var(--primary)',
          color: 'var(--white)',
          padding: '0.6rem 1.2rem',
          borderRadius: 'var(--radius)',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '0.85rem',
          boxShadow: 'var(--shadow-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-dark)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
        >
          <span>+</span> New Upload
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'var(--danger-light)',
          border: '1px solid #fecaca',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !error ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
          <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>
            No documents yet
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Upload your first rental agreement to get AI-powered analysis.
          </p>
          <Link to="/" style={{
            display: 'inline-block',
            background: 'var(--primary)',
            color: 'var(--white)',
            padding: '0.7rem 1.5rem',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-primary)',
          }}>
            Upload a Document →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {documents.map((doc) => {
            const riskKey = doc.risk_level?.toLowerCase();
            const cfg = RISK_CONFIG[riskKey];
            return (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    background: cfg ? cfg.bg : 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.1rem 1.4rem',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.1s',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        background: 'var(--primary-light)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}>
                        {doc.filename?.toLowerCase().endsWith('.docx') ? '📝' : '📄'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>
                          <p style={{
                            fontWeight: 600,
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '300px',
                          }}>
                            {doc.original_name || doc.filename}
                          </p>
                          <FileTypeChip filename={doc.filename} />
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(doc.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                          {' · '}
                          <span style={{
                            color: doc.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                            fontWeight: 600,
                          }}>
                            {doc.status === 'completed' ? 'Analysed' : doc.status || 'Uploaded'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <RiskBadge level={doc.risk_level} />
                      <span style={{ color: 'var(--text-light)', fontSize: '1rem' }}>›</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}