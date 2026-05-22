import NotificationBell from './NotificationBell';
import './TopBar.css';

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-right">
        <NotificationBell />
      </div>
    </header>
  );
}
