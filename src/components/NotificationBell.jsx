import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../lib/notifications';
import './NotificationBell.css';

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

const kindText = {
  assigned:  'te atribuiu à tarefa',
  updated:   'atualizou a tarefa',
  mentioned: 'mencionou você em',
  commented: 'comentou em',
};

export default function NotificationBell() {
  const { notifications, unread, markRead, markAll } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n) => {
    if (!n.read) markRead(n.id);
    if (n.taskId) navigate(`/tasks?task=${n.taskId}`);
    setOpen(false);
  };

  const recent = notifications.slice(0, 8);

  return (
    <div className="nb-wrap" ref={ref}>
      <button
        className={`nb-btn ${unread > 0 ? 'nb-btn--active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Notificações"
        aria-label={`${unread} notificações não lidas`}
      >
        <Bell size={20} className={unread > 0 ? 'nb-icon--ringing' : ''} />
        {unread > 0 && (
          <span className="nb-count">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-dropdown-header">
            <span className="nb-dropdown-title">Notificações</span>
            {unread > 0 && (
              <button className="nb-mark-all" onClick={() => { markAll(); }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="nb-list">
            {recent.length === 0 ? (
              <div className="nb-empty">
                <Bell size={32} />
                <p>Nenhuma notificação ainda.</p>
              </div>
            ) : (
              recent.map(n => (
                <button
                  key={n.id}
                  className={`nb-item ${n.read ? '' : 'nb-item--unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="nb-avatar">{userEmoji(n.actor)}</span>
                  <div className="nb-body">
                    <p className="nb-text">
                      <strong>{n.actor}</strong> {kindText[n.kind] ?? 'atualizou'}{' '}
                      <strong>"{n.taskTitle}"</strong>
                    </p>
                    <span className="nb-time">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className="nb-dot" />}
                </button>
              ))
            )}
          </div>

          {notifications.length > 8 && (
            <div className="nb-dropdown-footer">
              <button className="nb-view-all" onClick={() => { setOpen(false); navigate('/inbox'); }}>
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
