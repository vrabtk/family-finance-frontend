import { useEffect } from 'react';
import useUIStore from '../../store/ui.store';
import useIsMobile from '../../utils/useIsMobile';

export default function Modal({
  id,
  open: controlledOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 440,
  showClose = true,
  contentStyle,
}) {
  const { modal, closeModal } = useUIStore();
  const isMobile = useIsMobile();
  const open = id ? modal?.name === id : controlledOpen;
  const handleClose = id ? closeModal : onClose;
  const hasHeader = Boolean(title || subtitle);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose?.(); };
    if (open) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  useEffect(() => () => {
    document.body.style.overflow = '';
  }, []);

  useEffect(() => {
    if (!open) document.body.style.overflow = '';
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose?.(); }}
      style={{
        position:'fixed', inset:0, background:'rgba(4,8,14,.74)', backdropFilter:'blur(10px)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:isMobile ? '12px' : 'clamp(14px, 3vw, 28px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        style={{
          position:'relative',
          background:'linear-gradient(180deg, rgba(13,20,34,.98) 0%, rgba(9,14,24,.99) 100%)',
          border:'1px solid rgba(37,54,80,.9)',
          borderRadius:isMobile ? '20px' : '24px',
          boxShadow:'0 30px 90px rgba(0,0,0,.42)',
          width:`min(${typeof width === 'number' ? `${width}px` : width}, calc(100vw - ${isMobile ? 24 : 28}px))`,
          maxHeight:'min(94dvh, 820px)',
          overflowY:'auto',
          ...contentStyle,
        }}
      >
        {showClose && !hasHeader && (
          <button
            type="button"
            onClick={() => handleClose?.()}
            aria-label="Close dialog"
            style={{
              position:'absolute',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 12,
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 16,
              zIndex: 1,
            }}
          >
            ×
          </button>
        )}
        {hasHeader && (
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,padding:isMobile ? '18px 18px 0' : '22px 24px 0'}}>
            <div style={{minWidth:0}}>
              {title && <h3 style={{fontSize:isMobile ? 18 : 20,fontWeight:800,letterSpacing:-.5,marginBottom:subtitle ? 6 : 0,lineHeight:1.15}}>{title}</h3>}
              {subtitle && <div style={{fontSize:13,color:'var(--text-dim)',lineHeight:1.7}}>{subtitle}</div>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={() => handleClose?.()}
                aria-label="Close dialog"
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: 12,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div style={{padding: hasHeader ? (isMobile ? '16px 18px 18px' : '18px 24px 24px') : (isMobile ? '18px' : '20px 22px 22px')}}>
          {children}
        </div>
      </div>
    </div>
  );
}
