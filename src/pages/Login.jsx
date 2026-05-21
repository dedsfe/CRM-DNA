import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { USERS } from '../mockData';
import { Lock } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { authed, login, chooseUser } = useAuth();
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  const submitPassword = (e) => {
    e.preventDefault();
    if (!login(pw)) {
      setError(true);
      setPw('');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">CM</div>
        <h1 className="login-title">Client Manager</h1>

        {!authed ? (
          <>
            <p className="login-sub">Digite a senha de acesso</p>
            <form onSubmit={submitPassword} className="login-form">
              <div className={`login-input-wrap ${error ? 'login-input-wrap--error' : ''}`}>
                <Lock size={15} className="login-input-ico" />
                <input
                  type="password"
                  className="login-input"
                  placeholder="Senha"
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(false); }}
                  autoFocus
                />
              </div>
              {error && <p className="login-error">Senha incorreta.</p>}
              <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={!pw}>
                Entrar
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="login-sub">Quem é você?</p>
            <div className="login-users">
              {USERS.map(u => (
                <button key={u} className="login-user" onClick={() => chooseUser(u)}>
                  <span className="login-user-emoji">{u === 'André' ? '🧑' : '👩'}</span>
                  <span className="login-user-name">{u}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
