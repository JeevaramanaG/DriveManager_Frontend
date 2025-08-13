import { useState, useEffect, useRef } from 'react';
import { Alert } from '../types';

export const useWebSocket = (url: string) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Mock WebSocket for demo purposes
    const mockWebSocket = () => {
      setIsConnected(true);
      
      // Simulate periodic alerts
      const interval = setInterval(() => {
        const mockAlert: Alert = {
          id: Date.now().toString(),
          driveId: Math.random() > 0.5 ? 'C:' : 'D:',
          driveName: Math.random() > 0.5 ? 'System Drive (C:)' : 'Data Drive (D:)',
          usagePercentage: 85 + Math.random() * 10,
          threshold: 80,
          timestamp: new Date(),
          severity: Math.random() > 0.7 ? 'critical' : 'warning'
        };

        setAlerts(prev => [mockAlert, ...prev.slice(0, 4)]);
      }, 30000);

      return () => {
        clearInterval(interval);
        setIsConnected(false);
      };
    };

    const cleanup = mockWebSocket();
    return cleanup;
  }, [url]);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return { alerts, isConnected, dismissAlert };
};