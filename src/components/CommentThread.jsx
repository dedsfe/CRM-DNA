import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { useAuth } from '../lib/auth';
import { fetchComments, insertComment, notifyComment, notifyCommentMentions } from '../lib/api';
import { USERS } from '../mockData';
import { X, Send } from 'lucide-react';

const userEmoji = (u) => (u === 'André' ? '🧑' : '👩');

/* Normaliza acentos pra comparação (André → andre) */
const norm = (s) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'agora';
  if (diff < 3600)   return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

/* Renderiza o body destacando @Nome em azul — estilo Notion */
function renderBody(text) {
  const pattern = new RegExp(`(@${USERS.join('|@')})`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    USERS.some(u => part === '@' + u)
      ? <span key={i} className="mention-tag">{part}</span>
      : part
  );
}

/* ─── CommentThread ─── */
export default function CommentThread({ parentType, parentId, parentTitle, onClose }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [body, setBody]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState(null);

  /* @mention state */
  const [mentionQuery, setMentionQuery] = useState(null); // null = fechado
  const [mentionStart, setMentionStart] = useState(-1);   // posição do @ no texto
  const textareaRef = useRef(null);
  const listRef     = useRef(null);

  useEffect(() => {
    fetchComments(parentType, parentId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [parentType, parentId]);

  /* Scroll para o último comentário sempre que a lista muda */
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments]);

  /* Detecta @query enquanto digita */
  const handleChange = (e) => {
    const val    = e.target.value;
    const cursor = e.target.selectionStart;
    setBody(val);

    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);           // o que foi digitado após @
      setMentionStart(textBefore.lastIndexOf('@'));
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  /* Insere @Nome ao clicar na sugestão */
  const pickMention = (name) => {
    const before  = body.slice(0, mentionStart);
    const after   = body.slice(mentionStart + 1 + mentionQuery.length);
    setBody(before + '@' + name + ' ' + after);
    setMentionQuery(null);
    setMentionStart(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  /* Usuários filtrados pelo que foi digitado após @ */
  const suggestions = mentionQuery !== null
    ? USERS.filter(u => norm(u).startsWith(norm(mentionQuery)))
    : [];

  const post = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const saved = await insertComment({ parentType, parentId, author: user, body: text });
      setComments(c => [...c, saved]);
      setBody('');
      setMentionQuery(null);
      await notifyComment(parentType, parentId, parentTitle, user);
      await notifyCommentMentions(text, user, parentTitle);
    } catch (e) {
      setErr(e.message || 'Não foi possível enviar o comentário.');
    }
    setBusy(false);
  };

  const onKeyDown = (e) => {
    /* Fecha dropdown com Escape sem fechar o modal */
    if (e.key === 'Escape' && mentionQuery !== null) {
      e.stopPropagation();
      setMentionQuery(null);
      return;
    }
    /* Envia com Ctrl/Cmd + Enter */
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      post();
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <h3>💬 Comentários</h3>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="thread-sub">{parentTitle}</div>

      {/* Lista de comentários */}
      <div className="thread-list" ref={listRef}>
        {loading ? (
          <p className="thread-empty">Carregando…</p>
        ) : comments.length === 0 ? (
          <p className="thread-empty">Nenhum comentário ainda. Comece a conversa 👇</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="thread-item">
              <span className={`thread-avatar thread-avatar--${c.author === 'André' ? 'blue' : 'purple'}`}>
                {userEmoji(c.author)}
              </span>
              <div className="thread-body">
                <div className="thread-meta">
                  <strong>{c.author}</strong>
                  <span className="thread-time">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="thread-text">{renderBody(c.body)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Área de composição */}
      <div className="thread-compose">
        {err && <div className="db-error">⚠️ {err}</div>}

        <div className="mention-wrap">
          <textarea
            ref={textareaRef}
            className="input textarea thread-textarea"
            rows={2}
            placeholder={`Comentar… use @ para mencionar`}
            value={body}
            onChange={handleChange}
            onKeyDown={onKeyDown}
          />

          {/* Dropdown de @mention */}
          {mentionQuery !== null && suggestions.length > 0 && (
            <div className="mention-menu">
              {suggestions.map(u => (
                <button
                  key={u}
                  className="mention-opt"
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickMention(u); }}
                >
                  <span className="mention-opt-emoji">{userEmoji(u)}</span>
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="thread-compose-actions">
          <span className="thread-hint">⌘ Enter para enviar</span>
          <button
            className="btn btn-primary btn-sm"
            disabled={!body.trim() || busy}
            onClick={post}
          >
            <Send size={13} /> {busy ? 'Enviando…' : 'Comentar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
