import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/* Estilos inline à prova de falha — independem do CSS carregar. */
const OVERLAY_STYLE = {
  position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)', zIndex: 2147483000, padding: 20,
};
const MODAL_STYLE = {
  background: '#FFFFFF', borderRadius: 28,
  width: 500, maxWidth: 'calc(100vw - 40px)',
  maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
  boxShadow: '0 20px 48px rgba(0,0,0,0.22)',
};

/* Modal renderizado no document.body via portal. */
export default function Modal({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="overlay" style={OVERLAY_STYLE} onClick={onClose}>
      <div className="modal" style={MODAL_STYLE} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
