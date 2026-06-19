import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="app-shell">
      <div className="hide-mobile" style={{ display: 'flex' }}>
        <Sidebar />
      </div>
      <div className="main-content">
        <TopBar />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
