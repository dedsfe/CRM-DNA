import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { NotificationsProvider } from './lib/notifications';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Home from './pages/Home';
import Clients from './pages/Clients';
import Tasks from './pages/Tasks';
import Inbox from './pages/Inbox';
import Meetings from './pages/Meetings';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import Trash from './pages/Trash';
import CommandPalette from './components/CommandPalette';
import TopBar from './components/TopBar';

import { UndoProvider } from './lib/undo';

function Shell() {
  const { authed, user } = useAuth();

  if (!authed || !user) {
    return <Login />;
  }

  return (
    <UndoProvider>
      <NotificationsProvider>
        <BrowserRouter>
          <div className="app-shell">
            <TopBar />
            <Sidebar />
            <div className="page-content">
              <Routes>
                <Route path="/"            element={<Home />} />
                <Route path="/clients"     element={<Clients />} />
                <Route path="/tasks"       element={<Tasks />} />
                <Route path="/inbox"       element={<Inbox />} />
                <Route path="/meetings"    element={<Meetings />} />
                <Route path="/finance"     element={<Finance />} />
                <Route path="/settings"    element={<Settings />} />
                <Route path="/trash"       element={<Trash />} />
              </Routes>
            </div>
            <CommandPalette />
          </div>
        </BrowserRouter>
      </NotificationsProvider>
    </UndoProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
