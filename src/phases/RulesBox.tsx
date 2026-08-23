import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';

/**
 * A collapsible box holding **verbatim** rulebook text. Used across the phase screens,
 * the turn overview and the Action dialogs so the affordance is identical everywhere:
 * an accent-tinted 📖 bar with the chevron on the RIGHT, expanding to the exact rules as
 * written in the "Chronobot & Chronossus Solo Opponents" rulebook. The label needs no
 * "rules"/"rulebook text" suffix — the icon says what it is. Any app-specific changes are
 * shown separately by the caller (see the Setup screen).
 *
 * When the chosen language has no OFFICIAL rulebook transcription, the box keeps showing
 * the English text and says so. A verbatim box exists to match the book in the player's
 * hands; an unofficial rendering of it would quietly stop doing that, so the honest move
 * is English plus a notice.
 */
export default function RulesBox({
  label,
  children,
  defaultOpen = false,
  showPreamble = false,
}: {
  /** Defaults to the translated "Rulebook text". */
  label?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Show the one-time explanation of what these boxes are (Setup screen only). */
  showPreamble?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { t, rulebookIsEnglish, languageName } = useI18n();
  return (
    <div className={`rules-box ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="rules-box-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="rules-box-icon">📖</span>
        <span className="rules-box-label">{label ?? t('ui.rulesBox.label')}</span>
        <span className="rules-box-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="rules-box-body">
          {showPreamble && (
            <p className="rules-box-preamble">{t('ui.rulesBox.preamble')}</p>
          )}
          {rulebookIsEnglish && (
            <p className="rules-box-preamble">
              {t('ui.rulesBox.englishFallback', { language: languageName })}
            </p>
          )}
          <div className="rules-box-text">{children}</div>
        </div>
      )}
    </div>
  );
}
