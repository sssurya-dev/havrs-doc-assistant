import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../utils/api';

const ACCEPTED_TYPES = {
  'application/pdf': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
};
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];
const MAX_FILE_SIZE_MB = 10;

function getFileIcon(file) {
  if (!file) return null;
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) return '📝';
  return '📄';
}

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (!f) return;

    const ext = '.' + f.name.split('.').pop().toLowerCase();
    const isValidType = ACCEPTED_TYPES[f.type] || ACCEPTED_EXTENSIONS.includes(ext);

    if (!isValidType) {
      setError('Please upload a PDF or .docx Word document.');
      return;
    }

    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large — maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setFile(f);
    setError('');
    setStatus('idle');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setError('');
    try {
      setStatus('uploading');
      const uploaded = await uploadDocument(file);
      const docId = uploaded.documentId;
      setStatus('done');
      setTimeout(() => navigate(`/documents/${docId}`), 700);
    } catch (err) {
      setError(
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        'Something went wrong. Is the backend running?'
      );
      setStatus('error');
    }
  };

  const isIdle = status === 'idle' || status === 'error';
  const isProcessing = status === 'uploading' || status === 'done';
  const fileIcon = getFileIcon(file);

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ textAlign: 'center', maxWidth: '520px', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '0.6rem' }}>
          Upload Your Document
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6 }}>
          Upload a rental agreement or property document and our AI will extract key clauses, flag risks, and answer your questions.
        </p>
      </div>

      {/* Upload card */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        padding: '2rem',
      }}>

        {/* Drop zone */}
        <div
          style={{
            border: `2px dashed ${dragging ? 'var(--primary)' : file ? 'var(--accent)' : '#cbd5e1'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--primary-faint)' : file ? 'var(--accent-light)' : 'var(--bg)',
            transition: 'all 0.2s ease',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {file ? (
            <>
              <div style={{ fontSize: '2.75rem', lineHeight: 1, marginBottom: '0.75rem' }}>{fileIcon}</div>
              <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                {file.name}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {file.size < 1024 * 1024
                  ? `${(file.size / 1024).toFixed(1)} KB`
                  : `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                } · <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Click to change</span>
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'var(--primary-light)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.5rem',
              }}>
                📂
              </div>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.3rem' }}>
                {dragging ? 'Drop your file here' : 'Drag & drop your document here'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                or <span style={{ color: 'var(--primary)', fontWeight: 600 }}>browse to upload</span>
              </p>
              <p style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>
                PDF or .docx · Max {MAX_FILE_SIZE_MB} MB
              </p>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            background: 'var(--danger-light)',
            border: '1px solid #fecaca',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            marginTop: '1rem',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Status message */}
        {(status === 'uploading' || status === 'done') && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--primary-faint)',
            border: '1px solid #bfdbfe',
            color: 'var(--primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            marginTop: '1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}>
            {status === 'uploading' ? (
              <><span>⏳</span><span>Uploading &amp; analysing your document…</span></>
            ) : (
              <><span>✅</span><span>Done! Redirecting to your results…</span></>
            )}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!file || isProcessing}
          style={{
            marginTop: '1.25rem',
            width: '100%',
            padding: '0.85rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            borderRadius: 'var(--radius)',
            background: !file || isProcessing ? '#94a3b8' : 'var(--primary)',
            color: 'var(--white)',
            cursor: !file || isProcessing ? 'not-allowed' : 'pointer',
            boxShadow: !file || isProcessing ? 'none' : 'var(--shadow-primary)',
            letterSpacing: '0.01em',
            transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
          }}
          onMouseEnter={e => {
            if (file && !isProcessing) e.currentTarget.style.background = 'var(--primary-dark)';
          }}
          onMouseLeave={e => {
            if (file && !isProcessing) e.currentTarget.style.background = 'var(--primary)';
          }}
        >
          {isProcessing ? 'Processing…' : 'Analyse Agreement'}
        </button>
      </div>

      {/* Trust badges */}
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {[
          { icon: '✅', label: 'AI-Powered Analysis' },
          { icon: '🔒', label: 'Secure Upload' },
          { icon: '📋', label: 'Clause Extraction' },
          { icon: '⚡', label: 'Instant Results' },
        ].map(({ icon, label }) => (
          <div key={label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}>
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
