'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const Navbar: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setNotifications(data);
        })
        .catch(err => console.error(err));
    }
  }, [token]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="logo">
          <span className="logo-icon">🌸</span>
          <span className="logo-text">CycleCare</span>
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              <Link href="/cycles" className="nav-link">Cycles</Link>
              <Link href="/symptoms" className="nav-link">Symptoms</Link>
              <Link href="/assistant" className="nav-link ai-nav-link">AI Assistant ✨</Link>
              <Link href="/profile" className="nav-link">Profile</Link>
              
              <div className="notification-wrapper">
                <button 
                  className="bell-btn" 
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  🔔
                  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
                {showDropdown && (
                  <div className="notification-dropdown animate-fade-in">
                    <h4>Notifications</h4>
                    {notifications.length === 0 ? (
                      <p className="no-notifs">No new notifications</p>
                    ) : (
                      <ul className="notif-list">
                        {notifications.map(n => (
                          <li key={n.id} className={n.isRead ? 'read' : 'unread'}>
                            <p>{n.message}</p>
                            {!n.isRead && (
                              <button onClick={() => markAsRead(n.id)} className="mark-read-btn">
                                Mark as read
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">Login</Link>
              <Link href="/signup" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 1rem 0;
          background: var(--background);
          border-bottom: 1px solid var(--glass-border);
        }
        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .nav-link {
          font-weight: 500;
          color: var(--foreground);
        }
        .ai-nav-link {
          color: var(--primary);
          font-weight: 600;
          background: rgba(255, 77, 148, 0.1);
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 77, 148, 0.2);
          transition: all 0.2s ease;
        }
        .ai-nav-link:hover {
          background: var(--primary);
          color: white;
        }
        .logo-icon {
            font-size: 1.8rem;
        }
        .notification-wrapper {
          position: relative;
        }
        .bell-btn {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff4757;
          color: white;
          font-size: 0.7rem;
          font-weight: bold;
          padding: 0.1rem 0.4rem;
          border-radius: 50px;
        }
        .notification-dropdown {
          position: absolute;
          top: 150%;
          right: 0;
          width: 300px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          padding: 1rem;
          z-index: 100;
          border: 1px solid var(--glass-border);
        }
        .notification-dropdown h4 {
          margin-bottom: 1rem;
          font-size: 1.1rem;
          color: var(--primary-dark);
          border-bottom: 1px solid #eee;
          padding-bottom: 0.5rem;
        }
        .no-notifs {
          color: var(--text-muted);
          font-size: 0.9rem;
          text-align: center;
          padding: 1rem 0;
        }
        .notif-list {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 300px;
          overflow-y: auto;
        }
        .notif-list li {
          padding: 0.8rem;
          border-bottom: 1px solid #eee;
          font-size: 0.9rem;
        }
        .notif-list li.unread {
          background-color: #fff9fa;
          border-left: 3px solid var(--primary);
        }
        .notif-list li:last-child {
          border-bottom: none;
        }
        .notif-list p {
          margin-bottom: 0.5rem;
          color: #333;
        }
        .mark-read-btn {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 0.8rem;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
