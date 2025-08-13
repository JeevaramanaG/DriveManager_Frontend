import React from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { Alert } from '../types';

interface ThresholdAlertProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
}

const ThresholdAlert: React.FC<ThresholdAlertProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg shadow-lg border animate-slide-in ${
            alert.severity === 'critical'
              ? 'bg-red-50 border-red-200'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 ${
                alert.severity === 'critical' ? 'text-red-500' : 'text-orange-500'
              }`}>
                {alert.severity === 'critical' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <h4 className={`font-medium ${
                  alert.severity === 'critical' ? 'text-red-900' : 'text-orange-900'
                }`}>
                  Drive Space Alert
                </h4>
                <p className={`text-sm mt-1 ${
                  alert.severity === 'critical' ? 'text-red-700' : 'text-orange-700'
                }`}>
                  {alert.driveName} is {alert.usagePercentage.toFixed(1)}% full (threshold: {alert.threshold}%)
                </p>
                <p className={`text-xs mt-1 ${
                  alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className={`flex-shrink-0 ml-2 p-1 rounded-lg hover:bg-opacity-20 ${
                alert.severity === 'critical'
                  ? 'text-red-500 hover:bg-red-500'
                  : 'text-orange-500 hover:bg-orange-500'
              }`}
              aria-label={`Dismiss alert for ${alert.driveName}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThresholdAlert;