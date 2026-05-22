import { useState, useEffect } from 'react';
import { fetchTransactions, insertTransaction, deleteTransaction, fetchClients, fetchInvoices, processMonthlyRecurring, fetchRecurringTransactions, insertRecurringTransaction, deleteRecurringTransaction, toggleRecurringTransaction } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { Plus, TrendingUp, TrendingDown, Trash2, DollarSign, AlertCircle, Clock, Award, Wallet, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon } from 'lucide-react';
import './Finance.css';

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [recurringTxs, setRecurringTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ 
    type: 'income', amount: '', description: '', category: 'Outros', 
    date: new Date().toISOString().split('T')[0], clientId: '',
    isRecurring: false, dueDay: new Date().getDate()
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    processMonthlyRecurring().then(() => {
      Promise.all([fetchTransactions(), fetchClients(), fetchInvoices(), fetchRecurringTransactions()])
        .then(([txs, cls, invs, recs]) => {
          setTransactions(txs);
          setClients(cls);
          setInvoices(invs);
          setRecurringTxs(recs);
        })
        .finally(() => setLoading(false));
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (form.isRecurring) {
        await insertRecurringTransaction({
          type: form.type,
          amount: parseFloat(form.amount),
          description: form.description,
          category: form.category,
          dueDay: Number(form.dueDay || 1),
          clientId: form.clientId || null
        });
        await loadData();
      } else {
        const tx = await insertTransaction({
          type: form.type,
          amount: parseFloat(form.amount),
          description: form.description,
          category: form.category,
          date: form.date,
          clientId: form.clientId || null
        });
        setTransactions([tx, ...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }

      setIsModalOpen(false);
      setForm({ 
        type: 'income', amount: '', description: '', category: 'Outros', 
        date: new Date().toISOString().split('T')[0], clientId: '',
        isRecurring: false, dueDay: new Date().getDate()
      });
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

  const handleDeleteRecurring = async (id) => {
    if(!confirm('Excluir regra de pagamento fixo? (Isso não apaga transações passadas)')) return;
    try {
      await deleteRecurringTransaction(id);
      setRecurringTxs(recurringTxs.filter(r => r.id !== id));
    } catch (err) {
      alert('Erro ao excluir regra');
    }
  };

  const handleToggleRecurring = async (rule) => {
    try {
      const updated = await toggleRecurringTransaction(rule.id, !rule.active);
      setRecurringTxs(recurringTxs.map(r => r.id === updated.id ? updated : r));
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const formatBRL = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // === CÁLCULOS BIZARROS (MEGA DASHBOARD) ===
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // 1. All-time
  const allTimeIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const allTimeExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const allTimeBalance = allTimeIncome - allTimeExpense;

  // 2. Current Month & Margins
  const currentMonthTxs = transactions.filter(t => {
    const d = new Date(t.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const currentIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const currentExpense = currentMonthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const currentBalance = currentIncome - currentExpense;
  const currentMargin = currentIncome > 0 ? ((currentBalance / currentIncome) * 100).toFixed(1) : 0;

  // 3. Last Month (MoM)
  const lastMonthTxs = transactions.filter(t => {
    const d = new Date(t.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });
  const lastIncome = lastMonthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const lastExpense = lastMonthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  
  const incomeGrowth = lastIncome > 0 ? (((currentIncome - lastIncome) / lastIncome) * 100).toFixed(1) : (currentIncome > 0 ? 100 : 0);
  const expenseGrowth = lastExpense > 0 ? (((currentExpense - lastExpense) / lastExpense) * 100).toFixed(1) : (currentExpense > 0 ? 100 : 0);

  // 4. MRR & Projections
  const totalMRR = clients.reduce((acc, c) => acc + (Number(c.mrr) || 0), 0);
  const arrProjection = totalMRR * 12; // Anual
  const qrrProjection = totalMRR * 3;  // Trimestral

  // 5. Invoices (Atrasos e A Receber)
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  let overdueAmount = 0;
  let upcomingAmount = 0;

  pendingInvoices.forEach(inv => {
    const client = clients.find(c => c.id === inv.clientId);
    let amt = Number(inv.amount);
    if (inv.dueDate < today) {
       const daysLate = Math.floor((new Date(today) - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
       if (daysLate > 0 && client) {
          const mult = client.lateFeePercentage || 2;
          const juros = (client.lateFeeInterestPerMonth || 1) / 30;
          amt = amt + (amt * (mult / 100)) + (amt * (juros / 100) * daysLate);
       }
       overdueAmount += amt;
    } else {
       upcomingAmount += amt;
    }
  });

  // 6. Top Clients
  const clientRevenue = {};
  transactions.filter(t => t.type === 'income' && t.clientId).forEach(t => {
    clientRevenue[t.clientId] = (clientRevenue[t.clientId] || 0) + Number(t.amount);
  });
  const topClients = clients.map(c => ({
    ...c, generatedRevenue: clientRevenue[c.id] || 0
  })).sort((a,b) => b.generatedRevenue - a.generatedRevenue).slice(0, 4);

  // 7. Charts
  const last6Months = [];
  for(let i=5; i>=0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const monthStr = d.toLocaleString('pt-BR', { month: 'short' });
    const txsInMonth = transactions.filter(t => {
      const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });
    const inc = txsInMonth.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const exp = txsInMonth.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    last6Months.push({ name: monthStr, Entradas: inc, Saidas: exp, Saldo: inc - exp });
  }

  const expenseCategories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    expenseCategories[t.category] = (expenseCategories[t.category] || 0) + Number(t.amount);
  });
  const pieData = Object.keys(expenseCategories).map(k => ({ name: k, value: expenseCategories[k] })).sort((a,b) => b.value - a.value);
  const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8', '#E11D48', '#10B981'];

  // Helper render badge MoM
  const renderGrowthBadge = (growth, reverseLogic = false) => {
    const isPositive = Number(growth) > 0;
    const isZero = Number(growth) === 0;
    // For expenses, positive growth is "bad" (red), negative is "good" (green)
    const isGood = reverseLogic ? !isPositive : isPositive;
    if (isZero) return <span className="mom-badge mom-neutral">0%</span>;
    return (
      <span className={`mom-badge ${isGood ? 'mom-good' : 'mom-bad'}`}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(growth)}% vs último mês
      </span>
    );
  };

  return (
    <div className="page finance-page">
      <header className="page-header finance-header">
        <div className="page-header-title">
          <h1>War Room Financeiro</h1>
          <p className="page-subtitle">Seu centro de comando de dados, projeções e saúde do caixa.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Nova Transação
        </button>
      </header>

      {/* TIER 1: HIGH LEVEL OVERVIEW (ALL TIME / PROJECTIONS) */}
      <div className="bento-grid">
        <div className="bento-card hero-card bg-gradient-blue">
          <div className="bento-icon"><Wallet size={24} /></div>
          <div className="bento-content">
            <span className="bento-label">Saldo Histórico (All-Time)</span>
            <span className="bento-value hero-value">{formatBRL(allTimeBalance)}</span>
            <span className="bento-subtext">Todas as Entradas: {formatBRL(allTimeIncome)}</span>
          </div>
        </div>
        <div className="bento-card hero-card bg-gradient-purple">
          <div className="bento-icon"><TrendingUp size={24} /></div>
          <div className="bento-content">
            <span className="bento-label">Receita Recorrente (MRR)</span>
            <span className="bento-value hero-value">{formatBRL(totalMRR)}</span>
            <span className="bento-subtext">Projeção Anual (ARR): <strong>{formatBRL(arrProjection)}</strong></span>
          </div>
        </div>
        <div className="bento-card stats-card">
          <div className="bento-icon red-icon"><AlertCircle size={20} /></div>
          <div className="bento-content">
            <span className="bento-label">Inadimplência (Atrasos)</span>
            <span className="bento-value text-red">{formatBRL(overdueAmount)}</span>
            <span className="bento-subtext">Dinheiro na mesa aguardando baixa.</span>
          </div>
        </div>
        <div className="bento-card stats-card">
          <div className="bento-icon green-icon"><Clock size={20} /></div>
          <div className="bento-content">
            <span className="bento-label">Previsão (A Receber)</span>
            <span className="bento-value text-green">{formatBRL(upcomingAmount)}</span>
            <span className="bento-subtext">Faturas lançadas no prazo.</span>
          </div>
        </div>
      </div>

      {/* TIER 2: CURRENT MONTH PERFORMANCE */}
      <h2 className="section-title">Desempenho deste Mês</h2>
      <div className="finance-kpis">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--green"><TrendingUp size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Entradas</span>
            <span className="kpi-value text-green">{formatBRL(currentIncome)}</span>
            {renderGrowthBadge(incomeGrowth, false)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--red"><TrendingDown size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Saídas</span>
            <span className="kpi-value text-red">{formatBRL(currentExpense)}</span>
            {renderGrowthBadge(expenseGrowth, true)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--blue"><PieChartIcon size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Margem de Lucro</span>
            <span className="kpi-value">{currentMargin}%</span>
            <span className="mom-badge mom-neutral">Lucro Líquido: {formatBRL(currentBalance)}</span>
          </div>
        </div>
      </div>

      {/* TIER 3: CHARTS & TOP CLIENTS */}
      <div className="bento-grid-charts">
        <div className="chart-card area-span-2">
          <h3>Evolução do Caixa (6 meses)</h3>
          <div className="finance-chart-shell">
            <ResponsiveContainer>
              <AreaChart data={last6Months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--red)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--red)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#86868b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#86868b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <Tooltip cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2 }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="Entradas" stroke="var(--green)" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="Saidas" stroke="var(--red)" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Despesas por Categoria</h3>
          <div className="finance-chart-shell finance-chart-shell--pie">
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
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

      {/* TIER 4: TOP CLIENTS & EXTRACT */}
      <div className="bento-grid-bottom">
        {/* Top Clientes */}
        <div className="top-clients-card card">
          <div className="ledger-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Award size={24} color="var(--gold)" />
            <h2>Top Clientes (Receita Histórica)</h2>
          </div>
          <div className="top-clients-list">
            {topClients.filter(c => c.generatedRevenue > 0).length === 0 ? (
              <p className="tasks-empty">Nenhuma receita vinculada a clientes ainda.</p>
            ) : (
              topClients.filter(c => c.generatedRevenue > 0).map((client, index) => (
                <div key={client.id} className="top-client-item">
                  <div className="tc-rank">#{index + 1}</div>
                  <div className="tc-info">
                    <span className="tc-name">{client.emoji} {client.name}</span>
                    <span className="tc-mrr">MRR: {formatBRL(client.mrr || 0)}</span>
                  </div>
                  <div className="tc-rev">{formatBRL(client.generatedRevenue)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Extrato Recente */}
        <div className="finance-ledger card">
          <div className="ledger-header">
            <h2>Últimas Transações</h2>
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
                {transactions.slice(0, 15).map(tx => {
                  const client = clients.find(c => c.id === tx.clientId);
                  return (
                    <tr key={tx.id}>
                      <td>{new Date(tx.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600, color: 'var(--black)' }}>{tx.description}</td>
                      <td><span className="cat-chip">{tx.category}</span></td>
                      <td>{client ? <span className="client-chip">{client.name}</span> : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: tx.type === 'income' ? 'var(--green-text)' : 'var(--red)' }}>
                        {tx.type === 'income' ? '+' : '-'} {formatBRL(Number(tx.amount))}
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
      </div>

      {/* Regras Fixas Mensais */}
      <div className="card" style={{ marginTop: 24, padding: 24 }}>
        <div className="ledger-header" style={{ marginBottom: 16 }}>
          <h2>Fixos / Mensais (Regras de Lançamento)</h2>
          <p style={{ color: 'var(--mid-gray)', fontSize: 13, marginTop: 4 }}>
            Estas regras geram transações automaticamente no dia do vencimento de todo mês.
          </p>
        </div>
        <div className="ledger-table-container">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Valor Mensal</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recurringTxs.map(rule => (
                <tr key={rule.id} style={{ opacity: rule.active ? 1 : 0.5 }}>
                  <td><span className={`cat-chip ${rule.type === 'income' ? 'chip-green' : 'chip-red'}`}>{rule.type === 'income' ? 'Entrada' : 'Saída'}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--black)' }}>{rule.description}</td>
                  <td>Todo dia {rule.dueDay}</td>
                  <td style={{ fontWeight: 700, color: rule.type === 'income' ? 'var(--green-text)' : 'var(--red)' }}>
                    {rule.type === 'income' ? '+' : '-'} {formatBRL(Number(rule.amount))}
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleToggleRecurring(rule)}>
                      {rule.active ? 'Pausar' : 'Ativar'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => handleDeleteRecurring(rule.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {recurringTxs.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--mid-gray)' }}>Nenhuma regra mensal cadastrada.</td></tr>
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
                  <label>Data (Se único)</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} disabled={form.isRecurring} />
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

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <input type="checkbox" id="isRecurring" style={{ width: 'auto' }} checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} />
                <label htmlFor="isRecurring" style={{ cursor: 'pointer', margin: 0, fontWeight: 'bold' }}>Tornar Mensal / Fixo</label>
              </div>

              {form.isRecurring && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label>Gerar automaticamente todo mês no Dia:</label>
                  <input type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({...form, dueDay: e.target.value})} />
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: 24 }}>
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
