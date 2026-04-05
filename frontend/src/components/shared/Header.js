import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/shared.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-logo">Jewel</h1>
      </div>
      <div className="header-center">
        <span className="header-link">MyStorePOS</span>
      </div>
      <div className="header-right">
        <span className="header-role">Role: {user?.role || 'Employee'}</span>
        <button className="header-logout" onClick={handleLogout}>
          Profile / Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
