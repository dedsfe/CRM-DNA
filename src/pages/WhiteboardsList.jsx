import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Plus, Search, Trash2 } from 'lucide-react';
import './WhiteboardsList.css';

export default function WhiteboardsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whiteboards')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching whiteboards:', error);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    const title = prompt("Qual o nome do quadro?", "Novo Quadro");
    if (!title) return;
    const owner = user || 'André';

    const { data, error } = await supabase
      .from('whiteboards')
      .insert([{ title, owner, data: { nodes: [], connections: [] } }])
      .select();

    if (!error && data?.length > 0) {
      navigate(`/whiteboard/${data[0].id}`);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este quadro?')) return;
    
    const { error } = await supabase.from('whiteboards').delete().eq('id', id);
    if (!error) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const filtered = projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="wb-list-page">
      <div className="wb-list-header">
        <div>
          <h1>Whiteboards</h1>
          <p>Seus quadros infinitos de ideação e planejamento.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={16} /> Novo Quadro
        </button>
      </div>

      <div className="wb-list-search">
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Buscar quadro..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="wb-list-loading">Carregando projetos...</div>
      ) : (
        <div className="wb-list-grid">
          {filtered.map(proj => (
            <div key={proj.id} className="wb-list-card" onClick={() => navigate(`/whiteboard/${proj.id}`)}>
              <div className="wb-card-header">
                <h3>{proj.title}</h3>
                <button className="wb-card-delete" onClick={(e) => handleDelete(e, proj.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="wb-card-meta">
                <span className={`wb-card-tag ${proj.owner.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}`}>
                  {proj.owner}
                </span>
                <span className="wb-card-date">
                  {new Date(proj.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="wb-list-empty">Nenhum quadro encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
}
