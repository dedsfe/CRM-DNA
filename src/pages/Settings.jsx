import { useState, useEffect } from 'react';
import { fetchMcpKeys, createMcpKey, deleteMcpKey } from '../lib/api';
import { Plus, Trash2, Copy, CheckCircle2, Server, Key, Eye, EyeOff, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import './Settings.css';

const TEAM = [
  { name: 'André',    initial: 'A', avatar: 'sidebar-avatar--blue' },
  { name: 'Danyelle', initial: 'D', avatar: 'sidebar-avatar--purple' },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('team');
  
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [revealedIds, setRevealedIds] = useState(new Set());

  useEffect(() => {
    if (activeTab === 'integrations') loadKeys();
  }, [activeTab]);

  async function loadKeys() {
    setLoading(true);
    try {
      const data = await fetchMcpKeys();
      setKeys(data);
    } catch (err) {
      console.error('Failed to load keys', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const newKey = await createMcpKey(newKeyName.trim());
      setKeys([newKey, ...keys]);
      setNewKeyName('');
      setRevealedIds(prev => new Set([...prev, newKey.id]));
    } catch (err) {
      console.error('Failed to create key', err);
      alert('Erro ao criar chave.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja revogar esta chave? Qualquer IA usando ela perderá o acesso imediatamente.')) return;
    try {
      await deleteMcpKey(id);
      setKeys(keys.filter(k => k.id !== id));
    } catch (err) {
      console.error('Failed to delete key', err);
      alert('Erro ao remover chave.');
    }
  }

  function handleCopy(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleReveal(id) {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'Nunca usada';
    return new Date(isoStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div className="page-header-title">
          <h1>Configurações</h1>
          <p className="page-subtitle">Gerencie seu perfil, equipe e integrações de sistema.</p>
        </div>
      </header>

      <div className="settings-tabs">
        <button 
          className={`settings-tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Equipe & Conta
        </button>
        <button 
          className={`settings-tab ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          Integrações (IA)
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'team' && (
          <section className="card team-card">
            <h2>Membros da Equipe</h2>
            <p style={{ color: 'var(--mid-gray)', marginBottom: '24px' }}>Pessoas com acesso ao CRM.</p>
            <div className="team-list">
              {TEAM.map(({ name, initial, avatar }) => (
                <div key={name} className={`team-member ${user === name ? 'team-member--me' : ''}`}>
                  <div className={`team-avatar ${avatar}`}>{initial}</div>
                  <div className="team-info">
                    <span className="team-name">{name}</span>
                    <span className="team-role">{user === name ? 'Você' : 'Admin'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="account-actions" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--light-gray)' }}>
              <button className="btn btn-secondary" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={logout}>
                <LogOut size={16} />
                Sair do Sistema
              </button>
            </div>
          </section>
        )}

        {activeTab === 'integrations' && (
          <div className="integrations-content">
            <section className="card new-key-card">
              <h2>Nova Conexão</h2>
              <p>Crie uma chave para conectar uma nova IA (ex: Poke.com, Codex, Claude).</p>
              <form className="new-key-form" onSubmit={handleCreate}>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Nome da aplicação (ex: Poke.com)"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    maxLength={40}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={isCreating || !newKeyName.trim()}>
                    <Plus size={16} />
                    {isCreating ? 'Criando...' : 'Gerar Chave'}
                  </button>
                </div>
              </form>
            </section>

            <section className="keys-list-section">
              <h2>Chaves Ativas</h2>
              {loading ? (
                <p>Carregando chaves...</p>
              ) : keys.length === 0 ? (
                <div className="empty-state">
                  <Server size={48} className="empty-icon" />
                  <p>Nenhuma IA conectada ainda.</p>
                </div>
              ) : (
                <div className="keys-grid">
                  {keys.map(key => {
                    const isRevealed = revealedIds.has(key.id);
                    return (
                      <div key={key.id} className="card key-card">
                        <div className="key-card-header">
                          <h3>{key.name}</h3>
                          <button 
                            className="btn-icon btn-danger" 
                            onClick={() => handleDelete(key.id)}
                            title="Revogar chave"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="key-details">
                          <div className="key-value-box">
                            <span className="key-value">
                              {isRevealed ? key.keyValue : '••••••••••••••••••••••••••••'}
                            </span>
                            <div className="key-actions">
                              <button className="btn-icon" onClick={() => toggleReveal(key.id)} title={isRevealed ? "Esconder" : "Mostrar"}>
                                {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button className="btn-icon" onClick={() => handleCopy(key.keyValue, key.id)} title="Copiar Chave">
                                {copiedId === key.id ? <CheckCircle2 size={16} color="green" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                          <div className="key-meta">
                            <span className="meta-item">
                              <Key size={14} /> Criada em: {formatDate(key.createdAt)}
                            </span>
                            <span className="meta-item">
                              <Server size={14} /> Último uso: <strong>{formatDate(key.lastUsedAt)}</strong>
                            </span>
                          </div>

                          <div className="integration-instructions">
                            <h4>Como conectar no Poke.com ou Cursor:</h4>
                            <div className="code-snippet-box">
                              <code>
                                URL do Servidor: https://crm-dna.onrender.com/sse<br/>
                                Token / API Key: {key.keyValue}
                              </code>
                              <button 
                                className="btn-icon btn-small"
                                onClick={() => handleCopy(`URL: https://crm-dna.onrender.com/sse\nToken: ${key.keyValue}`, key.id + 'full')}
                              >
                                {copiedId === key.id + 'full' ? <CheckCircle2 size={14} color="green" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
