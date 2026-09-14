import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import s from './shell.module.css';

const COLLAPSE_KEY = 'mc-lab:sidebar-collapsed';

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      return !c;
    });
  };

  const navClass = ({ isActive }: { isActive: boolean }) => `${s.navLink} ${isActive ? s.navLinkActive : ''}`;

  return (
    <div className={`${s.app} ${collapsed ? s.appCollapsed : ''}`}>
      <Sidebar />
      <div className={s.main}>
        <header className={s.topbar}>
          <button className={`${s.btn} ${s.btnSmall}`} onClick={toggle} aria-label="Toggle task list">
            ☰
          </button>
          <NavLink to="/" className={s.brand}>
            ⚛️ Machine Coding Lab
          </NavLink>
          <nav className={s.nav}>
            <NavLink to="/" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/roadmap" className={navClass}>
              Roadmap
            </NavLink>
            <NavLink to="/mock" className={navClass}>
              Mock interview
            </NavLink>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
