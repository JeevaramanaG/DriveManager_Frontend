import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drive, Alert } from '../types';
import { api } from '../services/api';
import { formatBytes, getUsageColor, getUsageTextColor } from '../utils/formatters';
import ThresholdAlert from './ThresholdAlert';
import { 
  HardDrive, 
  Server, 
  Usb,
  TrendingUp,
  AlertTriangle,
  Activity,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('usageThresholds');
    return saved ? JSON.parse(saved) : {};
  });
  const [tempThresholds, setTempThresholds] = useState<Record<string, number>>(thresholds);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [prevUsage, setPrevUsage] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const navigate = useNavigate();

 useEffect(() => {
  const fetchDrives = async () => {
    try {
      const driveData = await api.getDrives();
      setDrives(driveData);

      // Only update thresholds if there are new drives
      setThresholds(prev => {
        const updated = { ...prev };
        let changed = false;
        driveData.forEach(drive => {
          if (!(drive.id in updated)) {
            updated[drive.id] = 80;
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('usageThresholds', JSON.stringify(updated));
        }
        return updated;
      });

      setTempThresholds(prev => {
        const updated = { ...prev };
        driveData.forEach(drive => {
          if (!(drive.id in updated)) {
            updated[drive.id] = 80;
          }
        });
        return updated;
      });

      // Clear dismissed alerts only when drive crosses below warning threshold
      setDismissedAlerts(prev => {
        const updated = prev.filter(id => {
          const [driveId] = id.split('-');
          const drive = driveData.find(d => d.id === driveId);
          const threshold = thresholds[driveId] || 80;
          return drive && drive.usagePercentage >= threshold - 10;
        });
        localStorage.setItem('dismissedAlerts', JSON.stringify(updated));
        return updated;
      });

      // Generate new alerts
      const newAlerts: Alert[] = driveData
        .filter(drive => {
          const threshold = thresholds[drive.id] || 80;
          const prev = prevUsage[drive.id] || 0;
          const alertId = `${drive.id}-${drive.usagePercentage.toFixed(1)}`;
          const crossesWarning = prev < threshold - 10 && drive.usagePercentage >= threshold - 10;
          const crossesCritical = prev < threshold && drive.usagePercentage >= threshold;
          return (crossesWarning || crossesCritical) && !dismissedAlerts.includes(alertId);
        })
        .map(drive => {
          const threshold = thresholds[drive.id] || 80;
          return {
            id: `${drive.id}-${drive.usagePercentage.toFixed(1)}`,
            driveId: drive.id,
            driveName: drive.label,
            usagePercentage: drive.usagePercentage,
            severity: drive.usagePercentage >= threshold ? 'critical' : 'warning',
            timestamp: new Date().toISOString(),
            threshold
          };
        });

      setAlerts(prev => {
        const alertIds = new Set(prev.map(a => a.id));
        return [...prev, ...newAlerts.filter(a => !alertIds.has(a.id))];
      });

      setPrevUsage(driveData.reduce((acc, drive) => ({
        ...acc,
        [drive.id]: drive.usagePercentage
      }), {}));
    } catch (error) {
      console.error('Failed to fetch drives:', error);
      setNotification({ type: 'error', message: 'Failed to fetch drives' });
    } finally {
      setIsLoading(false);
    }
  };

  fetchDrives();

  const interval = setInterval(fetchDrives, 60000);
  return () => clearInterval(interval);
}, []); // <-- run only once on mount

  const handleSaveThresholds = () => {
    const invalidThreshold = Object.values(tempThresholds).some(
      t => t < 0 || t > 100 || isNaN(t)
    );
    if (invalidThreshold) {
      setNotification({ type: 'error', message: 'Thresholds must be between 0 and 100' });
      return;
    }
    setThresholds(tempThresholds);
    localStorage.setItem('usageThresholds', JSON.stringify(tempThresholds));
    setNotification({ type: 'success', message: 'Thresholds saved successfully' });
    setIsSettingsOpen(false);
  };

  const handleThresholdChange = (driveId: string, value: number) => {
    setTempThresholds(prev => ({
      ...prev,
      [driveId]: value
    }));
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => {
      const updated = [...prev, alertId];
      localStorage.setItem('dismissedAlerts', JSON.stringify(updated));
      return updated;
    });
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getDriveIcon = (type: string) => {
    switch (type) {
      case 'network':
        return <Server className="h-6 w-6" />;
      case 'removable':
        return <Usb className="h-6 w-6" />;
      default:
        return <HardDrive className="h-6 w-6" />;
    }
  };

  const getOverallStats = () => {
    const totalSize = drives.reduce((sum, drive) => sum + drive.totalSize, 0);
    const totalUsed = drives.reduce((sum, drive) => sum + drive.usedSpace, 0);
    const avgUsage = drives.length > 0 ? drives.reduce((sum, drive) => sum + drive.usagePercentage, 0) / drives.length : 0;
    const criticalDrives = drives.filter(drive => drive.usagePercentage >= (thresholds[drive.id] || 80)).length;

    return { totalSize, totalUsed, avgUsage, criticalDrives };
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = getOverallStats();

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-20 right-4 z-60 p-4 rounded-lg shadow-lg border ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <ThresholdAlert alerts={alerts} onDismiss={handleDismissAlert} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drive Dashboard</h1>
          <p className="text-gray-600">Monitor and manage your system drives</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Activity className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Usage Threshold Settings</h2>
            <div className="mb-4 space-y-4">
              {drives.map(drive => (
                <div key={drive.id} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {drive.label} ({drive.id})
                  </label>
                  <input
                    type="number"
                    value={tempThresholds[drive.id] ?? 80}
                    onChange={(e) => handleThresholdChange(drive.id, parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    step="1"
                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0-100"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThresholds}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.totalSize)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <HardDrive className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Used Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.totalUsed)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Usage</p>
              <p className={`text-2xl font-bold ${getUsageTextColor(stats.avgUsage)}`}>
                {stats.avgUsage.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Drives</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticalDrives}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Drives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drives.map((drive) => (
          <div
            key={drive.id}
            onClick={() => navigate(`/drive/${drive.id}`)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  drive.usagePercentage >= (thresholds[drive.id] || 80) ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <div className={
                    drive.usagePercentage >= (thresholds[drive.id] || 80) ? 'text-red-600' : 'text-blue-600'
                  }>
                    {getDriveIcon(drive.type)}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {drive.label}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">{drive.type} Drive</p>
                </div>
              </div>
              {drive.usagePercentage >= (thresholds[drive.id] || 80) && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Usage</span>
                <span className={getUsageTextColor(drive.usagePercentage)}>
                  {drive.usagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(drive.usagePercentage)}`}
                  style={{ width: `${drive.usagePercentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{formatBytes(drive.totalSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Used:</span>
                <span className="font-medium">{formatBytes(drive.usedSpace)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Free:</span>
                <span className="font-medium text-green-600">{formatBytes(drive.freeSpace)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;