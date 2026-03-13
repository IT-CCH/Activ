import React, { useState, useEffect } from 'react';

const StatusIndicator = () => {
  const [status, setStatus] = useState('connected');

  useEffect(() => {
    const simulateConnection = () => {
      const statuses = ['connected', 'syncing', 'connected'];
      let index = 0;
      const interval = setInterval(() => {
        setStatus(statuses?.[index % statuses?.length]);
        index++;
      }, 5000);
      return interval;
    };

    const interval = simulateConnection();
    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="status-indicator" title={getStatusText()}>
      <div className={`status-dot ${status}`}></div>
      <span className="text-xs text-muted-foreground">{getStatusText()}</span>
    </div>
  );
};

export default StatusIndicator;