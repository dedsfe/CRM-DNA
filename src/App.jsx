import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { NotificationsProvider } from './lib/notifications';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Home from './pages/Home';
import Clients from './pages/Clients';
import Tasks from './pages/Tasks';
import Inbox from './pages/Inbox';

function Shell() {
  const { authed, user } = useAuth();

  if (!authed || !user) {
    return <Login />;
  }

  return (
    <NotificationsProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Sidebar />
          <div className="page-content">
            <Routes>
              <Route path="/"        element={<Home />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/tasks"   element={<Tasks />} />
              <Route path="/inbox"   element={<Inbox />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
