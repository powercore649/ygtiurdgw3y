import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ user, selectedGuild, onSelectGuild, activePage, setActivePage, mobileMenuOpen, setMobileMenuOpen }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const currentGuild = user?.allowedGuilds?.find(g => g.id === selectedGuild);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('zenith_token');
    window.location.href = '/login';
  };

  const closeMobileMenu = () => {
    if (typeof setMobileMenuOpen === 'function') setMobileMenuOpen(false);
  };

  return (
    <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header dashboard-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="sidebar-brand-block" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <p className="sidebar-kicker">AI Moderation Platform</p>
          <h2 className="brand-text-glow">Zyntra</h2>
        </div>
        <button 
          className="btn-icon mobile-only" 
          onClick={closeMobileMenu}
          style={{ background: 'none', border: 'none', color: '#DBDEE1', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="guild-selector" id="guild-selector" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
        <img 
          src={currentGuild?.icon ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
          alt="Guild" className="guild-icon" 
        />
        <span className="guild-name">{currentGuild?.name || 'Select Server'}</span>
        <i className="fa-solid fa-chevron-down"></i>
        
        <div className={`guild-dropdown ${dropdownOpen ? 'active' : ''}`}>
          {user?.allowedGuilds?.map(g => (
            <div 
              key={g.id} 
              className="guild-option" 
              onClick={(e) => { e.stopPropagation(); onSelectGuild(g.id); setDropdownOpen(false); closeMobileMenu(); }}
            >
              {g.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} className="guild-icon" alt="" />
              ) : (
                <div className="guild-icon" style={{ background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>#</div>
              )}
              <span className="guild-name">{g.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section-label">Navigation</div>
      <ul className="nav-links" style={{ flex: 'none' }}>
        <li onClick={() => { navigate('/'); closeMobileMenu(); }}>
          <i className="fa-solid fa-house"></i>
          <span>Home</span>
        </li>
      </ul>

      <div className="sidebar-section-label">Workspace</div>
      <ul className="nav-links">
        <li className={activePage === 'overview' ? 'active' : ''} onClick={() => { setActivePage('overview'); closeMobileMenu(); }}>
          <i className="fa-solid fa-chart-pie"></i>
          <span>Overview</span>
        </li>
        <li className={activePage === 'analytics' ? 'active' : ''} onClick={() => { setActivePage('analytics'); closeMobileMenu(); }}>
          <i className="fa-solid fa-chart-area"></i>
          <span>Analytics</span>
        </li>
        <li className={activePage === 'moderation' ? 'active' : ''} onClick={() => { setActivePage('moderation'); closeMobileMenu(); }}>
          <i className="fa-solid fa-gavel"></i>
          <span>Moderation</span>
        </li>
        <li className={activePage === 'automod' ? 'active' : ''} onClick={() => { setActivePage('automod'); closeMobileMenu(); }}>
          <i className="fa-solid fa-shield-halved"></i>
          <span>Auto Moderation</span>
        </li>
        <li className={activePage === 'members' ? 'active' : ''} onClick={() => { setActivePage('members'); closeMobileMenu(); }}>
          <i className="fa-solid fa-users"></i>
          <span>Members</span>
        </li>
        <li className={activePage === 'notifications' ? 'active' : ''} onClick={() => { setActivePage('notifications'); closeMobileMenu(); }}>
          <i className="fa-solid fa-bell"></i>
          <span>Notifications</span>
        </li>
        <li className={activePage === 'audit' ? 'active' : ''} onClick={() => { setActivePage('audit'); closeMobileMenu(); }}>
          <i className="fa-solid fa-scroll"></i>
          <span>Audit Log</span>
        </li>
        <li className={activePage === 'commands' ? 'active' : ''} onClick={() => { setActivePage('commands'); closeMobileMenu(); }}>
          <i className="fa-solid fa-terminal"></i>
          <span>Command Center</span>
        </li>
        <li className={activePage === 'docs' ? 'active' : ''} onClick={() => { setActivePage('docs'); closeMobileMenu(); }}>
          <i className="fa-solid fa-book text-accent"></i>
          <span>Docs & Guides</span>
        </li>
        <li className={activePage === 'status' ? 'active' : ''} onClick={() => { setActivePage('status'); closeMobileMenu(); }}>
          <i className="fa-solid fa-signal"></i>
          <span>Bot Status</span>
        </li>
      </ul>

      <div className="sidebar-section-label">Account</div>
      <ul className="nav-links" style={{ flex: 'none' }}>
        <li className={activePage === 'account' ? 'active' : ''} onClick={() => { setActivePage('account'); closeMobileMenu(); }}>
          <i className="fa-solid fa-user-gear"></i>
          <span>Account Manager</span>
        </li>
      </ul>

      <div className="sidebar-footer-note">
        <span className="sidebar-footer-dot"></span>
        <span>Built for fast moderation, safer communities, and contributor-friendly ops.</span>
      </div>

      <div className="user-profile" style={{ marginTop: 'auto' }}>
        <img 
          src={user?.avatar ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
          alt="User" className="user-avatar" 
        />
        <div className="user-info">
          <h4>{user?.username || 'Loading...'}</h4>
          <span className="logout-btn" onClick={handleLogout}>Log out</span>
        </div>
      </div>
    </nav>
  );
}
