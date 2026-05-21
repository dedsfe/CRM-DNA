import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../lib/notifications';
import { CheckCheck, Inbox as InboxIcon } from 'lucide-react';
import './Inbox.css';

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
  assigned:  'marcou você na tarefa',
  updated:   'atualizou a tarefa',
  mentioned: 'mencionou você em',
};

export default function Inbox() {
  const { notifications, unread, markRead, markAll } = useNotifications();
  const navigate = useNavigate();

  const open = (n) => {
    if (!n.read) markRead(n.id);
    if (n.taskId) navigate(`/tasks?task=${n.taskId}`);
  };

  return (
    <div className="ib">
      <div className="ib-header">
        <div>
          <h1 className="ib-title">📥 Caixa de Entrada</h1>
          <p className="ib-sub">
            {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAll}>
            <CheckCheck size={15} /> Marcar todas como lidas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="ib-empty">
          <InboxIcon size={40} />
          <p>Nenhuma notificação por aqui.</p>
        </div>
      ) : (
        <div className="ib-list">
          {notifications.map(n => (
            <button
              key={n.id}
              className={`ib-item ${n.read ? '' : 'ib-item--unread'}`}
              onClick={() => open(n)}
            >
              <span className="ib-avatar">{userEmoji(n.actor)}</span>
              <div className="ib-body">
                <p className="ib-text">
                  <strong>{n.actor}</strong> {kindText[n.kind] ?? 'atualizou'}{' '}
                  <strong>"{n.taskTitle}"</strong>
                </p>
                <span className="ib-time">{timeAgo(n.createdAt)}</span>
              </div>
              {!n.read && <span className="ib-dot" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
