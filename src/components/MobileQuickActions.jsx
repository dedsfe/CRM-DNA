import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus2, CheckSquare, Plus, Users, X } from 'lucide-react';
import {
  buildCreateClientPath,
  buildCreateMeetingPath,
  buildCreateTaskPath,
} from '../lib/navigation';
import { useIsMobile } from '../lib/useIsMobile';
import './MobileQuickActions.css';

const ACTIONS = [
  {
    title: 'Novo Cliente',
    description: 'Cadastrar uma nova conta no CRM',
    icon: Users,
    to: buildCreateClientPath(),
  },
  {
    title: 'Nova Tarefa',
    description: 'Registrar uma entrega sem procurar a coluna',
    icon: CheckSquare,
    to: buildCreateTaskPath(),
  },
  {
    title: 'Agendar Reunião',
    description: 'Abrir a agenda e criar um compromisso',
    icon: CalendarPlus2,
    to: buildCreateMeetingPath(),
  },
];

export default function MobileQuickActions() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="mqa">
      <button
        className={`mqa-trigger ${open ? 'mqa-trigger--open' : ''}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
      >
        {open ? <X size={18} /> : <Plus size={18} />}
      </button>

      {open && (
        <>
          <button
            className="mqa-backdrop"
            type="button"
            aria-label="Fechar ações rápidas"
            onClick={() => setOpen(false)}
          />
          <div className="mqa-sheet" role="dialog" aria-label="Ações rápidas">
            <div className="mqa-sheet-head">
              <p className="mqa-kicker">Mobile</p>
              <h2 className="mqa-title">Ações rápidas</h2>
              <p className="mqa-subtitle">Crie itens sem navegar manualmente pelas telas.</p>
            </div>

            <div className="mqa-list">
              {ACTIONS.map(({ title, description, icon: Icon, to }) => (
                <button
                  key={title}
                  className="mqa-action"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(to);
                  }}
                >
                  <span className="mqa-action-icon">
                    <Icon size={18} />
                  </span>
                  <span className="mqa-action-copy">
                    <span className="mqa-action-title">{title}</span>
                    <span className="mqa-action-description">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
