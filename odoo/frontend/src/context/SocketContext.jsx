import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { Snackbar, Alert } from '@mui/material';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      return;
    }

    // Connect to the backend server
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      // Join role room
      newSocket.emit('join_role_room', user.role);
    });

    // Listen for live room-based notifications
    newSocket.on('notification', (data) => {
      console.log('Notification received:', data);
      const newNotif = {
        id: data.id || Math.random().toString(),
        title: data.title || 'Notification',
        message: data.message || '',
        type: data.type || 'info',
        timestamp: data.timestamp || new Date(),
        read: false
      };
      
      setNotifications(prev => [newNotif, ...prev].slice(0, 30));
      setNotification({
        message: `${data.title}: ${data.message}`,
        severity: data.type || 'info',
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, markAllAsRead, clearNotifications }}>
      {children}
      
      {/* Toast Alert for live updates */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {notification ? (
          <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SocketContext.Provider>
  );
};
