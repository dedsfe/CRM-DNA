import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, CheckSquare, FileText, ArrowRight } from 'lucide-react';
import { fetchClients, fetchTasks, fetchInvoices } from '../lib/api';
import './CommandPalette.css';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Handle global shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Esc to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch data when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      Promise.all([fetchClients(), fetchTasks(), fetchInvoices()])
        .then(([c, t, i]) => {
          setClients(c);
          setTasks(t);
          setInvoices(i);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lowerQuery = query.toLowerCase();

  // Generate results
  const results = [];
  
  if (lowerQuery.length > 0) {
    // 1. Clients
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(lowerQuery));
    filteredClients.forEach(c => {
      results.push({
        id: `client-${c.id}`,
        type: 'client',
        label: c.name,
        subtext: c.status === 'active' ? 'Cliente Ativo' : 'Em Negociação',
        icon: <Users size={16} />,
        action: () => {
          setIsOpen(false);
          navigate(`/clients?id=${c.id}`);
        }
      });
    });

    // 2. Tasks
    const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(lowerQuery));
    filteredTasks.forEach(t => {
      // Find client name if task is linked
      const c = clients.find(cl => cl.id === t.clientId);
      results.push({
        id: `task-${t.id}`,
        type: 'task',
        label: t.title,
        subtext: c ? `Para: ${c.name}` : (t.status === 'completed' ? 'Concluída' : 'Pendente'),
        icon: <CheckSquare size={16} />,
        action: () => {
          setIsOpen(false);
          navigate(`/tasks`); // Or ideally directly to the task, but for now /tasks
        }
      });
    });

    // 3. Invoices
    const filteredInvoices = invoices.filter(i => i.description.toLowerCase().includes(lowerQuery));
    filteredInvoices.forEach(i => {
      const c = clients.find(cl => cl.id === i.clientId);
      results.push({
        id: `inv-${i.id}`,
        type: 'invoice',
        label: i.description,
        subtext: `${c ? c.name : 'Desconhecido'} - R$ ${i.amount}`,
        icon: <FileText size={16} />,
        action: () => {
          setIsOpen(false);
          if (c) navigate(`/clients?id=${c.id}&tab=finance`);
        }
      });
    });
  } else {
    // Show some default suggestions when query is empty
    results.push(
      { id: 'nav-home', type: 'nav', label: 'Ir para Dashboard', icon: <ArrowRight size={16}/>, action: () => { setIsOpen(false); navigate('/'); } },
      { id: 'nav-clients', type: 'nav', label: 'Ver todos os clientes', icon: <Users size={16}/>, action: () => { setIsOpen(false); navigate('/clients'); } },
      { id: 'nav-tasks', type: 'nav', label: 'Minhas tarefas', icon: <CheckSquare size={16}/>, action: () => { setIsOpen(false); navigate('/tasks'); } }
    );
  }

  // Keyboard navigation inside modal
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    }
  };

  return (
    <div className="cmd-backdrop" onClick={() => setIsOpen(false)}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-search-wrap">
          <Search size={20} className="cmd-search-icon" />
          <input 
            ref={inputRef}
            className="cmd-input" 
            placeholder="O que você está procurando?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="cmd-badge">ESC</div>
        </div>

        <div className="cmd-results">
          {results.length === 0 ? (
            <div className="cmd-empty">Nenhum resultado encontrado.</div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div 
                  key={item.id} 
                  className={`cmd-item ${isSelected ? 'cmd-item--selected' : ''}`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={`cmd-item-icon cmd-item-icon--${item.type}`}>
                    {item.icon}
                  </div>
                  <div className="cmd-item-body">
                    <span className="cmd-item-label">{item.label}</span>
                    {item.subtext && <span className="cmd-item-sub">{item.subtext}</span>}
                  </div>
                  {isSelected && (
                    <div className="cmd-item-enter">
                      <span className="cmd-badge">↵</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        <div className="cmd-footer">
          <span>Use as setas para navegar, e Enter para selecionar.</span>
        </div>
      </div>
    </div>
  );
}
