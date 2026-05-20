import React, { useEffect } from 'react';

const rows = [
  { keys: '?', desc: 'Open this shortcuts panel (when not in a field)' },
  { keys: 'Esc', desc: 'Close this panel or profile menu' },
  { keys: 'Ctrl K', desc: 'Open global search' },
  { keys: 'G + O', desc: 'Go to Overview' },
  { keys: 'G + M', desc: 'Go to Moderation' },
  { keys: 'G + A', desc: 'Go to Analytics' },
  { keys: 'G + S', desc: 'Go to Bot Status' },
  { keys: 'G + C', desc: 'Go to Command Center' },
];

export default function QuickHelp({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay quick-help-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-help-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card glass-panel pop-in quick-help-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="quick-help-title" style={{ margin: 0, fontSize: '1.35rem' }}>
          Keyboard shortcuts
        </h2>
        <p className="modal-subtitle">Work faster in the control surface without breaking your flow.</p>

        <p className="quick-help-tip">
          Your last opened workspace section is restored automatically when you return to the dashboard.
        </p>

        <table className="shortcut-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.desc}>
                <td>
                  <kbd className="shortcut-kbd">{row.keys}</kbd>
                </td>
                <td>{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="modal-actions" style={{ marginTop: 24 }}>
          <button type="button" className="btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
