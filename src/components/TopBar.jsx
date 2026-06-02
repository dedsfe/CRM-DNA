import NotificationBell from './NotificationBell';
import MobileQuickActions from './MobileQuickActions';
import './TopBar.css';

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-right">
        <MobileQuickActions />
        <NotificationBell />
      </div>
    </header>
  );
}
