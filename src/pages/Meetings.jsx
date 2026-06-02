import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchMeetings, fetchClients, insertMeeting, updateMeeting, deleteMeeting } from '../lib/api';
import { Calendar as CalendarIcon, Clock, Plus, Video, Trash2, Edit2, X, MessageSquare } from 'lucide-react';
import Modal from '../components/Modal';
import './Meetings.css';

const formatDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 16);
};

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Form state
  const [form, setForm] = useState({
    title: '',
    clientId: '',
    scheduledAt: '',
    meetLink: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([fetchMeetings(), fetchClients()])
      .then(([m, c]) => {
        setMeetings(m);
        setClients(c);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenModal = (meeting = null) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setForm({
        title: meeting.title,
        clientId: meeting.clientId,
        scheduledAt: formatDateTimeLocal(meeting.scheduledAt),
        meetLink: meeting.meetLink,
        notes: meeting.notes,
      });
    } else {
      setEditingMeeting(null);
      setForm({
        title: '',
        clientId: clients[0]?.id || '',
        scheduledAt: formatDateTimeLocal(new Date().toISOString()),
        meetLink: '',
        notes: '',
      });
    }
    setModalOpen(true);
  };

  useEffect(() => {
    if (loading || searchParams.get('quickAction') !== 'new-meeting') return;
    const timer = window.setTimeout(() => {
      setEditingMeeting(null);
      setForm({
        title: '',
        clientId: clients[0]?.id || '',
        scheduledAt: formatDateTimeLocal(new Date().toISOString()),
        meetLink: '',
        notes: '',
      });
      setModalOpen(true);
    }, 0);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('quickAction');
    setSearchParams(nextParams, { replace: true });
    return () => window.clearTimeout(timer);
  }, [clients, loading, searchParams, setSearchParams]);

  const handleSave = async () => {
    try {
      const payload = {
        title: form.title,
        clientId: form.clientId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        meetLink: form.meetLink,
        notes: form.notes,
        status: editingMeeting ? editingMeeting.status : 'scheduled',
      };

      if (editingMeeting) {
        const updated = await updateMeeting({ id: editingMeeting.id, ...payload });
        setMeetings(p => p.map(m => m.id === updated.id ? updated : m));
      } else {
        const created = await insertMeeting(payload);
        setMeetings(p => [...p, created]);
      }
      setModalOpen(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta reunião?')) return;
    try {
      await deleteMeeting(id);
      setMeetings(p => p.filter(m => m.id !== id));
      setModalOpen(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const markCompleted = async (meeting) => {
    try {
      const updated = await updateMeeting({ ...meeting, status: 'completed' });
      setMeetings(p => p.map(m => m.id === updated.id ? updated : m));
    } catch (e) {
      setError(e.message);
    }
  };

  const upcoming = meetings.filter(m => m.status === 'scheduled').sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const past = meetings.filter(m => m.status === 'completed').sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

  const MeetingCard = ({ meeting }) => {
    const client = clients.find(c => c.id === meeting.clientId);
    const date = new Date(meeting.scheduledAt);
    const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const isNow = meeting.status === 'scheduled' && (date.getTime() - new Date().getTime()) < 15 * 60 * 1000 && (date.getTime() - new Date().getTime()) > -60 * 60 * 1000;

    return (
      <div className={`mtg-card ${isNow ? 'mtg-card--now' : ''} ${meeting.status === 'completed' ? 'mtg-card--done' : ''}`}>
        <div className="mtg-card-date">
          <span className="mtg-day">{dateStr}</span>
          <span className="mtg-time"><Clock size={12} /> {timeStr}</span>
        </div>
        
        <div className="mtg-card-body">
          <div className="mtg-card-header">
            <h4>{meeting.title}</h4>
            <span className="mtg-client-chip">{client?.emoji} {client?.name}</span>
          </div>
          
          {meeting.notes && (
            <p className="mtg-card-notes"><MessageSquare size={12}/> {meeting.notes.substring(0, 100)}{meeting.notes.length > 100 ? '...' : ''}</p>
          )}

          <div className="mtg-card-actions">
            {meeting.meetLink && (
              <a href={meeting.meetLink} target="_blank" rel="noreferrer" className={`btn btn-sm ${isNow ? 'btn-primary' : 'btn-secondary'}`}>
                <Video size={14} /> Entrar na Sala
              </a>
            )}
            
            {meeting.status === 'scheduled' && (
              <button className="btn btn-sm" onClick={() => markCompleted(meeting)}>✅ Concluir</button>
            )}
            
            <button className="icon-btn" onClick={() => handleOpenModal(meeting)}><Edit2 size={14} /></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="meetings-page">
      <div className="page-header">
        <div>
          <h1>🗓️ Reuniões</h1>
          <p>Agenda e histórico de reuniões</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Agendar Reunião
        </button>
      </div>

      {error && <div className="db-error">⚠️ {error}</div>}

      {loading ? (
        <div className="db-loading">Carregando agenda...</div>
      ) : (
        <div className="meetings-layout">
          <div className="meetings-column">
            <h3 className="column-title">Próximas Reuniões</h3>
            {upcoming.length === 0 ? (
              <p className="empty-state">Sua agenda está livre! 🎉</p>
            ) : (
              upcoming.map(m => <MeetingCard key={m.id} meeting={m} />)
            )}
          </div>
          
          <div className="meetings-column">
            <h3 className="column-title">Histórico (Concluídas)</h3>
            {past.length === 0 ? (
              <p className="empty-state">Nenhum histórico ainda.</p>
            ) : (
              past.map(m => <MeetingCard key={m.id} meeting={m} />)
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <div className="modal-head">
            <h3>{editingMeeting ? '✏️ Editar Reunião' : '🗓️ Nova Reunião'}</h3>
            <button className="icon-btn" onClick={() => setModalOpen(false)}><X size={16} /></button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label className="field-label">Título</label>
              <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Onboarding" />
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Cliente</label>
                <select className="input" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Data e Hora</label>
                <input type="datetime-local" className="input" value={form.scheduledAt} onChange={e => setForm({...form, scheduledAt: e.target.value})} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Link da Reunião (Meet/Zoom)</label>
              <input className="input" value={form.meetLink} onChange={e => setForm({...form, meetLink: e.target.value})} placeholder="https://meet.google.com/..." />
            </div>
            <div className="field">
              <label className="field-label">Anotações / Pauta</label>
              <textarea className="input" style={{ minHeight: 100 }} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Escreva os tópicos aqui..." />
            </div>
          </div>
          <div className="modal-foot">
            {editingMeeting && (
              <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(editingMeeting.id)}>
                <Trash2 size={14} /> Excluir
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!form.title || !form.clientId || !form.scheduledAt}>
              Salvar Reunião
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
