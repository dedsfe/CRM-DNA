import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../lib/auth';
import { fetchComments, insertComment, notifyComment } from '../lib/api';
import { X, Send } from 'lucide-react';

const userEmoji = (u) => (u === 'André' ? '🧑' : '👩');

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'agora';
  if (diff < 3600)   return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

/* Thread de comentários de uma tarefa ou cliente. */
export default function CommentThread({ parentType, parentId, parentTitle, onClose }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [body, setBody]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState(null);

  useEffect(() => {
    fetchComments(parentType, parentId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [parentType, parentId]);

  const post = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const saved = await insertComment({ parentType, parentId, author: user, body: text });
      setComments(c => [...c, saved]);
      setBody('');
      await notifyComment(parentType, parentId, parentTitle, user);
    } catch (e) {
      setErr(e.message || 'Não foi possível enviar o comentário.');
    }
    setBusy(false);
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h3>💬 Comentários</h3>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="thread-sub">{parentTitle}</div>

      <div className="thread-list">
        {loading ? (
          <p className="thread-empty">Carregando…</p>
        ) : comments.length === 0 ? (
          <p className="thread-empty">Nenhum comentário ainda. Comece a conversa 👇</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="thread-item">
              <span className="thread-avatar">{userEmoji(c.author)}</span>
              <div className="thread-body">
                <div className="thread-meta">
                  <strong>{c.author}</strong>
                  <span className="thread-time">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="thread-text">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="thread-compose">
        {err && <div className="db-error">⚠️ {err}</div>}
        <textarea
          className="input textarea"
          rows={2}
          placeholder="Escreva um comentário…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" disabled={!body.trim() || busy} onClick={post}>
          <Send size={14} /> {busy ? 'Enviando…' : 'Comentar'}
        </button>
      </div>
    </Modal>
  );
}
