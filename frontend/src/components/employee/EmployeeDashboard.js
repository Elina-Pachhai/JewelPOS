import React, { useState } from 'react';
import Header from '../shared/Header';
import ActionTabs from '../shared/ActionTabs';
import ProcessSale from './ProcessSale';
import InventoryView from './InventoryView';
import CustomerLookup from './CustomerLookup';
import Reports from './Reports';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/EmployeeDashboard.css';

const EmployeeDashboard = () => {
  const [activeView, setActiveView] = useState('process-sale');
  const { user } = useAuth();

  const handleContinueToCart = () => {
    setActiveView('process-sale');
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'process-sale':
        return <ProcessSale />;
      case 'inventory':
        return <InventoryView onContinueToCart={handleContinueToCart} />;
      case 'customer-lookup':
        return <CustomerLookup />;
      case 'reports':
        return <Reports />;
      default:
        return <ProcessSale />;
    }
  };

  return (
    <div className="employee-dashboard">
      <Header />
      <ActionTabs activeView={activeView} setActiveView={setActiveView} userRole={user?.role} />

      <div className="main-content">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
