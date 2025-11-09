import React, { createContext, useContext, useState } from 'react';
import { notification, Progress, Alert} from 'antd';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      addNotification: (config) => {
        notification[config.type || 'info']({
          message: config.message,
          description: config.description,
          duration: config.duration || 4.5,
        });
        return 'fallback-id';
      },
      updateNotification: () => {},
      removeNotification: () => {},
      notifications: []
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notificationConfig) => {
    const id = Date.now().toString();
    const newNotification = { id, ...notificationConfig };
    
    setNotifications(prev => [...prev, newNotification]);
    
    if (notificationConfig.showProgress) {
      return id;
    }
    
    notification[notificationConfig.type || 'info']({
      message: notificationConfig.message,
      description: notificationConfig.description,
      duration: notificationConfig.duration || 4.5,
    });
    
    return id;
  };

  const updateNotification = (id, updates) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, ...updates } : notif
      )
    );
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const value = {
    notifications,
    addNotification,
    updateNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <GlobalNotificationCenter />
    </NotificationContext.Provider>
  );
};

const GlobalNotificationCenter = () => {
  const { notifications, removeNotification } = useNotification();
  
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 1000,
      maxWidth: 400
    }}>
      {notifications.map(notif => (
        <div key={notif.id} style={{ marginBottom: 10 }}>
          <Notification
            {...notif}
            onClose={() => removeNotification(notif.id)}
          />
        </div>
      ))}
    </div>
  );
};

const Notification = ({ 
  type = 'info', 
  message, 
  description, 
  progress, 
  showProgress,
  onClose 
}) => {
  const alertProps = {
    [type]: true,
    message,
    description: showProgress ? (
      <div>
        <p>{description}</p>
        <Progress 
          percent={progress} 
          status={type === 'error' ? 'exception' : 'active'} 
          size="small" 
        />
      </div>
    ) : description,
    style: { minWidth: 300 },
    closable: true,
    onClose,
    showIcon: true
  };

  return <Alert {...alertProps} />;
};