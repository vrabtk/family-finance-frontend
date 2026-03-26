import { Link } from 'react-router-dom';
import useIsMobile from '../../utils/useIsMobile';

const wrapperStyles = {
  minHeight: '100dvh',
  padding: 'clamp(14px, 4vw, 40px)',
  overflowX: 'hidden',
  background: [
    'radial-gradient(circle at top left, rgba(240,180,41,.14), transparent 28%)',
    'radial-gradient(circle at bottom right, rgba(56,189,248,.12), transparent 30%)',
    'linear-gradient(180deg, #07101c 0%, #060a12 100%)',
  ].join(', '),
};

const shellStyles = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 460px)',
  gap: 24,
  alignItems: 'stretch',
};

const panelStyles = {
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(13,20,34,.96) 0%, rgba(9,14,24,.98) 100%)',
  border: '1px solid rgba(122,90,16,.28)',
  borderRadius: 'clamp(20px, 4vw, 28px)',
  boxShadow: '0 28px 70px rgba(0,0,0,.38)',
};

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  altLabel,
  altHref,
  altText,
  footer,
  children,
}) {
  const isMobile = useIsMobile(980);

  return (
    <div style={wrapperStyles}>
      <style>{`
        .auth-shell__hero {
          min-height: 560px;
          height: 100%;
          padding: clamp(28px, 5vw, 54px);
        }
        .auth-shell__form {
          min-height: 560px;
          height: 100%;
          padding: clamp(24px, 4vw, 34px);
        }
        @media (max-width: 980px) {
          .auth-shell {
            grid-template-columns: 1fr;
          }
          .auth-shell__hero {
            order: 2;
            min-height: auto;
            height: auto;
            padding-bottom: 26px;
          }
          .auth-shell__form {
            order: 1;
            min-height: auto;
            height: auto;
          }
        }
        @media (max-width: 640px) {
          .auth-shell__hero {
            padding: 22px 18px 20px;
          }
          .auth-shell__form {
            padding: 20px 18px 18px;
          }
          .auth-shell__hero-badge {
            margin-bottom: 18px;
          }
          .auth-shell__eyebrow {
            margin-bottom: 10px;
          }
          .auth-shell__hero-title {
            font-size: 30px;
            letter-spacing: -1px;
            margin-bottom: 12px;
          }
          .auth-shell__hero-subtitle {
            font-size: 14px;
            line-height: 1.65;
          }
          .auth-shell__feature-list {
            gap: 10px;
            margin-top: 22px;
          }
          .auth-shell__feature-item {
            padding: 11px 12px;
          }
          .auth-shell__form-switch {
            justify-content: flex-start;
            margin-bottom: 16px;
          }
          .auth-shell__footer {
            margin-top: 20px;
            padding-top: 16px;
          }
        }
      `}</style>
      <div
        className="auth-shell"
        style={{
          ...shellStyles,
          gridTemplateColumns: isMobile ? '1fr' : shellStyles.gridTemplateColumns,
          gap: isMobile ? 16 : shellStyles.gap,
          maxWidth: 1160,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <section className="auth-shell__hero" style={{ ...panelStyles, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0, width: '100%', maxWidth: '100%' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: -110, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,180,41,.18), transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: -130, left: -20, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,.14), transparent 70%)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="auth-shell__hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 999, background: 'rgba(19,29,48,.82)', border: '1px solid rgba(122,90,16,.26)', marginBottom: 28 }}>
              <div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'linear-gradient(135deg, var(--gold), #d49813)', color: '#16110a', fontSize: 18, boxShadow: '0 10px 24px rgba(240,180,41,.22)' }}>
                ₹
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4 }}>FamilyFinance</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Home finance cockpit</div>
              </div>
            </div>

            {eyebrow && (
              <div className="auth-shell__eyebrow" style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>
                {eyebrow}
              </div>
            )}
            <h1 className="auth-shell__hero-title" style={{ fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1.02, letterSpacing: -1.6, fontWeight: 800, maxWidth: 520, marginBottom: 14 }}>
              {title}
            </h1>
            <p className="auth-shell__hero-subtitle" style={{ maxWidth: 520, fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              {subtitle}
            </p>
          </div>

          <div className="auth-shell__feature-list" style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 12, marginTop: 34 }}>
            {[
              'Track monthly income, expenses, and surplus without spreadsheet drift.',
              'Keep loans, investments, insurance, banks, and overview in one workspace.',
              'Review shared household finance data with clean current-state dashboards.',
            ].map((item) => (
              <div
                key={item}
                className="auth-shell__feature-item"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: 'rgba(9,14,24,.72)',
                  border: '1px solid rgba(37,54,80,.8)',
                }}
              >
                <div style={{ width: 22, height: 22, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(52,211,153,.12)', color: 'var(--green)', fontSize: 11, fontWeight: 800 }}>
                  ✓
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-shell__form" style={{ ...panelStyles, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0, width: '100%', maxWidth: '100%' }}>
          <div>
            {altLabel && altHref && altText && (
              <div className="auth-shell__form-switch" style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, color: 'var(--text-muted)', marginBottom: 18, flexWrap: 'wrap', gap: 4 }}>
                {altLabel}
                <Link to={altHref} style={{ color: 'var(--gold)', marginLeft: 2, fontWeight: 700 }}>
                  {altText}
                </Link>
              </div>
            )}
            {children}
          </div>

          {footer && (
            <div className="auth-shell__footer" style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid rgba(37,54,80,.7)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {footer}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
