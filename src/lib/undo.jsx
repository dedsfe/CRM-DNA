import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { restoreItem } from './api';
import './UndoToast.css';

const UndoContext = createContext();

export function UndoProvider({ children }) {
  const [lastDeleted, setLastDeleted] = useState(null);

  const notifyDeleted = useCallback((type, id, title) => {
    setLastDeleted({ type, id, title, timestamp: Date.now() });
    
    // Ocultar o toast após 8 segundos
    setTimeout(() => {
      setLastDeleted(prev => (prev?.id === id ? null : prev));
    }, 8000);
  }, []);

  const undo = useCallback(async () => {
    if (!lastDeleted) return;
    try {
      await restoreItem(lastDeleted.type, lastDeleted.id);
      setLastDeleted(null);
      // Dispara um evento para as páginas atualizarem seus dados
      window.dispatchEvent(new Event('itemRestored'));
    } catch (e) {
      console.error("Failed to undo:", e);
    }
  }, [lastDeleted]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        // Apenas previne o default se não estiver num input, para não quebrar o Ctrl+Z nativo de texto
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return (
    <UndoContext.Provider value={{ notifyDeleted }}>
      {children}
      {lastDeleted && (
        <div className="undo-toast">
          <p>Movido para Lixeira: <strong>{lastDeleted.title}</strong></p>
          <button className="undo-btn" onClick={undo}>Desfazer (Ctrl+Z)</button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export const useUndo = () => useContext(UndoContext);
