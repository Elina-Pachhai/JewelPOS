import React from 'react';
import '../../styles/shared.css';

const ActionTabs = ({ activeView, setActiveView, userRole }) => {
  const tabs = [
    { id: 'process-sale', label: 'Process Sale' },
    { id: 'customer-lookup', label: 'Customer Lookup' },
    { id: 'reports', label: 'Reports', roles: ['Manager'] },
    { id: 'inventory', label: 'Inventory' }
  ];

  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab =>
    !tab.roles || tab.roles.includes(userRole)
  );

  return (
    <div className="action-tabs-container">
      <div className="action-tabs">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={`action-tab ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => setActiveView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionTabs;
