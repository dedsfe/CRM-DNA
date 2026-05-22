import { useEffect, useState } from 'react';
import { fetchTrash, restoreItem, deletePermanently } from '../lib/api';
import { Trash2, RotateCcw } from 'lucide-react';
import './Trash.css';

export default function Trash() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchTrash().then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    window.addEventListener('itemRestored', load);
    return () => window.removeEventListener('itemRestored', load);
  }, []);

  const handleRestore = async (item) => {
    await restoreItem(item.type, item.id);
    load();
    window.dispatchEvent(new Event('itemRestored'));
  };

  const handlePermanent = async (item) => {
    if (!window.confirm('Deseja excluir permanentemente? Isso não pode ser desfeito.')) return;
    await deletePermanently(item.type, item.id);
    load();
  };

  if (loading) return <div className="db-loading">Carregando lixeira…</div>;

  return (
    <div className="trash-page">
      <div className="tp-header">
        <div>
          <h1 className="tp-title">🗑️ Lixeira</h1>
          <p className="tp-sub">Itens apagados permanecem aqui por até 30 dias (mockado para este teste).</p>
        </div>
      </div>
      
      <div className="trash-list">
        {items.length === 0 ? (
          <p className="tasks-empty">A lixeira está vazia.</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="trash-item">
              <div className="trash-info">
                <span className={`badge ${item.type === 'client' ? 'badge-blue' : 'badge-orange'}`}>
                  {item.type === 'task' ? 'Tarefa' : 'Cliente'}
                </span>
                <strong className="trash-title">{item.title || item.name}</strong>
                <span className="trash-date">Apagado em: {new Date(item.deletedAt).toLocaleString()}</span>
              </div>
              <div className="trash-actions">
                <button onClick={() => handleRestore(item)} className="btn btn-secondary btn-sm">
                  <RotateCcw size={14}/> Restaurar
                </button>
                <button onClick={() => handlePermanent(item)} className="icon-btn" style={{color: 'var(--red)'}}>
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
