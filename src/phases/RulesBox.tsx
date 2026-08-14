import { useState } from 'react';

/**
 * A collapsible box holding **verbatim** rulebook text. Used across the phase screens,
 * the turn overview and the Action dialogs so the affordance is identical everywhere:
 * an accent-tinted 📖 bar with the chevron on the RIGHT, expanding to the exact rules as
 * written in the "Chronobot & Chronossus Solo Opponents" rulebook. The label needs no
 * "rules"/"rulebook text" suffix — the icon says what it is. Any app-specific changes are
 * shown separately by the caller (see the Setup screen).
 */
export default function RulesBox({
  label = 'Rulebook text',
  children,
  defaultOpen = false,
  showPreamble = false,
}: {
  label?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Show the one-time explanation of what these boxes are (Setup screen only). */
  showPreamble?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rules-box ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="rules-box-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="rules-box-icon">📖</span>
        <span className="rules-box-label">{label}</span>
        <span className="rules-box-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="rules-box-body">
          {showPreamble && (
            <p className="rules-box-preamble">
              When you see these boxes, they contain the exact rules as written in
              the rulebook.
            </p>
          )}
          <div className="rules-box-text">{children}</div>
        </div>
      )}
    </div>
  );
}
