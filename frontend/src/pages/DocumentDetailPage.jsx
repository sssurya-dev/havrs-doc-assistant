import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocument, chatWithDocument } from '../utils/api';
import jsPDF from 'jspdf';

const RISK_COLOR = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#059669',
};
const RISK_BG = {
  high: '#fef2f2',
  medium: '#fffbeb',
  low: '#f0fdf4',
};
const RISK_BADGE = {
  high: { bg: '#fee2e2', color: '#dc2626' },
  medium: { bg: '#fef3c7', color: '#d97706' },
  low: { bg: '#dcfce7', color: '#16a34a' },
};

function riskColor(level) {
  return RISK_COLOR[level?.toLowerCase()] || 'var(--text-muted)';
}

const EXPECTED_CLAUSES = [
  { key: 'Rent Amount', keywords: ['rent'] },
  { key: 'Security Deposit', keywords: ['deposit'] },
  { key: 'Lease Duration', keywords: ['duration', 'tenancy period', 'lease period', 'term of'] },
  { key: 'Pet Policy', keywords: ['pet'] },
  { key: 'Maintenance Responsibilities', keywords: ['maintenance', 'repair'] },
  { key: 'Termination / Notice Period', keywords: ['termination', 'notice period'] },
  { key: 'Utilities', keywords: ['utilit', 'electricity', 'water bill'] },
  { key: 'Entry & Inspection Rights', keywords: ['entry', 'inspection'] },
];

const TABS = [
  { key: 'overview', label: 'Overview', icon: '📋' },
  { key: 'clauses', label: 'Clauses', icon: '📑' },
  { key: 'risks', label: 'Risks', icon: '⚠️' },
  { key: 'chat', label: 'Chat', icon: '💬' },
];

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    getDocument(id)
      .then((data) => setDoc(data.document || data))
      .catch(() => setError('Could not load document.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    try {
      const res = await chatWithDocument(id, input, sessionId);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (res.sessionId) setSessionId(res.sessionId);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Sorry, something went wrong.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
      <p>Loading document…</p>
    </div>
  );
  if (error) return (
    <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--danger)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>❌</div>
      <p>{error}</p>
    </div>
  );
  if (!doc) return null;

  const analysis = doc.analysis_result || {};
  const clauses = analysis.key_clauses || [];
  const risks = analysis.risks || [];
  const summary = analysis.summary || 'No summary available.';
  const riskLevel = (analysis.overall_risk_level || doc.risk_level || 'unknown').toLowerCase();

  const foundText = clauses.map((c) => `${c.title} ${c.content}`.toLowerCase()).join(' ');
  const missingClauses = EXPECTED_CLAUSES.filter(
    (ec) => !ec.keywords.some((k) => foundText.includes(k))
  );

  const downloadReport = () => {
    const pdf = new jsPDF();
    const margin = 15;
    let y = 20;
    const lineHeight = 7;
    const pageWidth = 180;

    const addWrappedText = (text, fontSize = 10, isBold = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont(undefined, isBold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, pageWidth);
      lines.forEach((line) => {
        if (y > 280) { pdf.addPage(); y = 20; }
        pdf.text(line, margin, y);
        y += lineHeight;
      });
      y += 2;
    };

    addWrappedText('havrs. Document Analysis Report', 16, true);
    addWrappedText(doc.original_name || doc.filename, 10);
    addWrappedText(`Risk Level: ${riskLevel.toUpperCase()}`, 10, true);
    y += 4;

    addWrappedText('Summary', 13, true);
    addWrappedText(summary);
    y += 4;

    addWrappedText('Key Clauses', 13, true);
    if (clauses.length === 0) {
      addWrappedText('No clauses extracted.');
    } else {
      clauses.forEach((c) => addWrappedText(`• ${c.title}: ${c.content}`));
    }
    y += 4;

    addWrappedText('Risks', 13, true);
    if (risks.length === 0) {
      addWrappedText('No risks identified.');
    } else {
      risks.forEach((r) => addWrappedText(`• [${(r.severity || 'medium').toUpperCase()}] ${r.title}: ${r.description}`));
    }

    if (missingClauses.length > 0) {
      y += 4;
      addWrappedText('Missing From This Document', 13, true);
      missingClauses.forEach((mc) => addWrappedText(`• ${mc.key}`));
    }

    const baseName = (doc.original_name || doc.filename).replace(/\.(pdf|docx?)$/i, '');
    pdf.save(`${baseName}-report.pdf`);
  };

  const riskBadgeCfg = RISK_BADGE[riskLevel] || { bg: '#f1f5f9', color: '#64748b' };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* Back link */}
      <Link to="/documents" style={{
        color: 'var(--text-muted)',
        textDecoration: 'none',
        fontSize: '0.85rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontWeight: 500,
        transition: 'color 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        ← Back to Documents
      </Link>

      {/* Header */}
      <div style={{
        marginTop: '1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              wordBreak: 'break-word',
            }}>
              {doc.original_name || doc.filename}
            </h1>
            <span style={{
              display: 'inline-block',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: riskBadgeCfg.bg,
              color: riskBadgeCfg.color,
              flexShrink: 0,
            }}>
              {riskLevel} risk
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
            Uploaded {new Date(doc.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        <button
          onClick={downloadReport}
          style={{
            background: 'var(--white)',
            color: 'var(--primary)',
            border: '1.5px solid var(--primary)',
            padding: '0.55rem 1rem',
            fontWeight: 700,
            fontSize: '0.8rem',
            borderRadius: 'var(--radius)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--primary)';
            e.currentTarget.style.color = 'var(--white)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--white)';
            e.currentTarget.style.color = 'var(--primary)';
          }}
        >
          ⬇ Download Report
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        marginBottom: '1.5rem',
        background: 'var(--white)',
        padding: '0.35rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        width: 'fit-content',
      }}>
        {TABS.map(({ key, label, icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '7px',
                fontWeight: active ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--white)' : 'var(--text-muted)',
                border: 'none',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ---- Overview Tab ---- */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Summary card */}
          <div style={{
            background: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
              📋 Summary
            </h2>
            <p style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: '0.9rem' }}>{summary}</p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Clauses Found', value: clauses.length, color: 'var(--primary)' },
              { label: 'Risk Items', value: risks.length, color: riskColor(riskLevel) },
              { label: 'Missing Clauses', value: missingClauses.length, color: 'var(--warning)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--white)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                border: '1px solid var(--border)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>{label}</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Missing clauses */}
          {missingClauses.length > 0 && (
            <div style={{
              background: 'var(--warning-light)',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
            }}>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>⚠️</span> Missing from this document
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                These common rental agreement terms weren't found — double-check they aren't absent entirely.
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.9 }}>
                {missingClauses.map((mc) => (
                  <li key={mc.key}>{mc.key}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ---- Clauses Tab ---- */}
      {activeTab === 'clauses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {clauses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📑</div>
              <p>No clauses were extracted for this document.</p>
            </div>
          ) : clauses.map((clause, i) => (
            <div key={i} style={{
              background: 'var(--white)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.1rem 1.4rem',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '4px solid var(--primary)',
            }}>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text)', fontSize: '0.9rem' }}>
                {clause.title || clause.type || `Clause ${i + 1}`}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                {clause.content || clause.text || clause.description || JSON.stringify(clause)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ---- Risks Tab ---- */}
      {activeTab === 'risks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {risks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--success)', background: '#f0fdf4', borderRadius: 'var(--radius-lg)', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p style={{ fontWeight: 600 }}>No risks identified in this document.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Looks clean!</p>
            </div>
          ) : risks.map((risk, i) => {
            const level = (risk.severity || risk.level || 'medium').toLowerCase();
            return (
              <div key={i} style={{
                background: RISK_BG[level] || 'var(--white)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.1rem 1.4rem',
                borderLeft: `4px solid ${riskColor(level)}`,
                border: '1px solid var(--border)',
                borderLeftWidth: '4px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                    {risk.title || risk.type || `Risk ${i + 1}`}
                  </p>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: riskColor(level),
                    background: RISK_BADGE[level]?.bg || '#f1f5f9',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}>
                    {level}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                  {risk.description || risk.content || risk.text || JSON.stringify(risk)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Chat Tab ---- */}
      {activeTab === 'chat' && (
        <div style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '0.9rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>🤖</span>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
              AI Document Assistant
            </p>
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.72rem',
              background: '#dcfce7',
              color: '#16a34a',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              fontWeight: 600,
            }}>
              Online
            </span>
          </div>

          {/* Messages */}
          <div style={{
            height: '380px',
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2.5rem' }}>
                <p style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>💬</p>
                <p style={{ fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text)' }}>
                  Ask anything about this document
                </p>
                <p style={{ fontSize: '0.82rem' }}>
                  e.g. "What is the notice period?" · "Are there hidden charges?"
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
              }}>
                {msg.role === 'assistant' && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginBottom: '0.2rem', fontWeight: 500 }}>
                    AI Assistant
                  </p>
                )}
                <div style={{
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                  color: msg.role === 'user' ? 'var(--white)' : 'var(--text)',
                  padding: '0.7rem 1rem',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '0.875rem',
                  lineHeight: 1.65,
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginBottom: '0.2rem', fontWeight: 500 }}>AI Assistant</p>
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  padding: '0.7rem 1rem',
                  borderRadius: '16px 16px 16px 4px',
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}>
                  <span>●</span><span>●</span><span>●</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '0.85rem 1rem',
            display: 'flex',
            gap: '0.6rem',
            background: 'var(--bg)',
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about this agreement…"
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius)',
                border: '1.5px solid var(--border)',
                fontSize: '0.875rem',
                outline: 'none',
                background: 'var(--white)',
                color: 'var(--text)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={sendMessage}
              disabled={chatLoading || !input.trim()}
              style={{
                background: chatLoading || !input.trim() ? '#94a3b8' : 'var(--primary)',
                color: 'var(--white)',
                padding: '0.65rem 1.1rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                borderRadius: 'var(--radius)',
                cursor: chatLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                boxShadow: chatLoading || !input.trim() ? 'none' : 'var(--shadow-primary)',
              }}
              onMouseEnter={e => { if (!chatLoading && input.trim()) e.currentTarget.style.background = 'var(--primary-dark)'; }}
              onMouseLeave={e => { if (!chatLoading && input.trim()) e.currentTarget.style.background = 'var(--primary)'; }}
            >
              Send →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}