import { useState, useEffect } from 'react';
import { fetchTransactions, insertTransaction, deleteTransaction, fetchClients } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, TrendingUp, TrendingDown, Trash2, Search, Filter } from 'lucide-react';
import './Finance.css';

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ type: 'income', amount: '', description: '', category: 'Outros', date: new Date().toISOString().split('T')[0], clientId: '' });

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchClients()])
      .then(([txs, cls]) => {
        setTransactions(txs);
        setClients(cls);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const newTx = await insertTransaction({
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description,
        category: form.category,
        date: new Date(form.date).toISOString(),
        clientId: form.clientId || null
      });
      setTransactions([newTx, ...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setIsModalOpen(false);
      setForm({ type: 'income', amount: '', description: '', category: 'Outros', date: new Date().toISOString().split('T')[0], clientId: '' });
    } catch (err) {
      alert('Erro ao salvar transação');
    }
  };

  const handleDelete = async (id) => {
    if(!confirm('Excluir transação?')) return;
    try {
      await deleteTransaction(id);
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  // Metrics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = currentMonthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Chart Data: Last 6 months
  const last6Months = [];
  for(let i=5; i>=0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const monthStr = d.toLocaleString('pt-BR', { month: 'short' });
    const txsInMonth = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });
    const inc = txsInMonth.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const exp = txsInMonth.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    last6Months.push({ name: monthStr, Entradas: inc, Saidas: exp });
  }

  // Chart Data: Expenses by Category
  const expenseCategories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    expenseCategories[t.category] = (expenseCategories[t.category] || 0) + Number(t.amount);
  });
  const pieData = Object.keys(expenseCategories).map(k => ({ name: k, value: expenseCategories[k] })).sort((a,b) => b.value - a.value);
  const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8'];

  const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page finance-page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-title">
          <h1>Caixa & Finanças</h1>
          <p className="page-subtitle">Gestão de fluxo de caixa e relatórios financeiros.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Nova Transação
        </button>
      </header>

      {/* KPI Cards */}
      <div className="finance-kpis">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--blue">💰</div>
          <div className="kpi-info">
            <span className="kpi-label">Saldo do Mês</span>
            <span className="kpi-value">{formatBRL(balance)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--green"><TrendingUp size={20} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Entradas (Mês)</span>
            <span className="kpi-value" style={{ color: 'var(--green-text)' }}>{formatBRL(totalIncome)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--red"><TrendingDown size={20} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Saídas (Mês)</span>
            <span className="kpi-value" style={{ color: 'var(--red)' }}>{formatBRL(totalExpense)}</span>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className="finance-charts">
        <div className="chart-card">
          <h3>Fluxo de Caixa (6 meses)</h3>
          <div style={{ width: '100%', height: 300, marginTop: 24 }}>
            <ResponsiveContainer>
              <BarChart data={last6Months}>
                <XAxis dataKey="name" stroke="#86868b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#86868b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Entradas" fill="var(--green-text)" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="Saidas" fill="var(--red)" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Despesas por Categoria</h3>
          <div style={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatBRL(value)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--mid-gray)', fontSize: 14 }}>Sem dados de saída.</p>
            )}
          </div>
        </div>
      </div>

      {/* Extrato Table */}
      <div className="finance-ledger card">
        <div className="ledger-header">
          <h2>Extrato Recente</h2>
        </div>
        <div className="ledger-table-container">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 50).map(tx => {
                const client = clients.find(c => c.id === tx.clientId);
                return (
                  <tr key={tx.id}>
                    <td>{new Date(tx.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500, color: 'var(--black)' }}>{tx.description}</td>
                    <td><span className="cat-chip">{tx.category}</span></td>
                    <td>{client ? <span className="client-chip">{client.emoji} {client.name}</span> : '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? 'var(--green-text)' : 'var(--red)' }}>
                      {tx.type === 'income' ? '+' : '-'}{formatBRL(Number(tx.amount))}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => handleDelete(tx.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mid-gray)' }}>Nenhuma transação encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Transação */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Transação</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleCreate}>
              
              <div className="tx-type-selector">
                <button type="button" className={`tx-type-btn ${form.type === 'income' ? 'active-income' : ''}`} onClick={() => setForm({...form, type: 'income'})}>
                  Entrada (Receita)
                </button>
                <button type="button" className={`tx-type-btn ${form.type === 'expense' ? 'active-expense' : ''}`} onClick={() => setForm({...form, type: 'expense'})}>
                  Saída (Despesa)
                </button>
              </div>

              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Assinatura Claude, Aporte..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="Serviço">Serviço</option>
                    <option value="Software">Software</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Salário">Salário</option>
                    <option value="Equipamento">Equipamento</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Vincular a Cliente (Opcional)</label>
                <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                  <option value="">-- Nenhum (Geral) --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Transação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
