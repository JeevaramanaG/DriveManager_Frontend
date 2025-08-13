import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileSystemItem, Drive } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatBytes, getUsageColor, getUsageTextColor } from '../utils/formatters';
import FileTable from './FileTable';
import MoveFileDialog from './MoveFileDialog';
import {
  ArrowLeft,
  HardDrive,
  Folder,
  File,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface PathSegment {
  id: string;
  name: string;
}

const DriveDetails: React.FC = () => {
  const { driveId } = useParams<{ driveId: string }>();
  const navigate = useNavigate();
  useAuth();

  const [drive, setDrive] = useState<Drive | null>(null);
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState<FileSystemItem[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<PathSegment[]>([]);

  useEffect(() => {
    if (driveId) {
      fetchDriveData(currentFolderId || driveId);
    }
  }, [driveId, currentFolderId]);

  const fetchDriveData = async (id: string) => {
    setIsLoading(true);
    try {
      const [driveData, driveContents] = await Promise.all([
        api.getDrives(),
        api.getDriveContents(id)
      ]);

      const currentDrive = driveData.find(d => d.id === driveId);
      setDrive(currentDrive || null);
      setItems(driveContents);

      if (id !== driveId && driveContents.length > 0) {
        const currentItem = driveContents.find(item => item.id === id && item.type === 'folder');
        if (currentItem) {
          setPath(prev => {
            if (prev.some(segment => segment.id === id)) {
              return prev;
            }
            return [...prev, { id, name: currentItem.name }];
          });
        }
      } else if (id === driveId) {
        setPath([]);
      }
    } catch (error) {
      console.error('Failed to fetch drive data:', error);
      showNotification('error', 'Failed to load drive data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleBreadcrumbClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setPath(prev => prev.slice(0, prev.findIndex(segment => segment.id === folderId) + 1));
  };

  const handleBackClick = () => {
    if (currentFolderId) {
      setPath(prev => prev.slice(0, -1));
      setCurrentFolderId(path.length > 1 ? path[path.length - 2].id : null);
    } else {
      navigate('/');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDelete = async (path: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const success = await api.deleteItem(path);
      if (success) {
        setItems(prev => prev.filter(item => item.path !== path));
        showNotification('success', 'Item deleted successfully');
      } else {
        showNotification('error', 'Failed to delete item');
      }
    } catch (error) {
      showNotification('error', 'Failed to delete item');
    }
  };

  const handleMove = (itemsToMove: FileSystemItem[]) => {
    setItemsToMove(itemsToMove);
    setMoveDialogOpen(true);
  };

  const handleMoveConfirm = async (destinationDrive: string, destinationPath: string) => {
  try {
    console.log('handleMoveConfirm called with:', { destinationDrive, destinationPath }); // Log for debugging
    const operations = itemsToMove.map(item => ({
      source: item.path,
      destination: destinationPath // Use the full destinationPath from MoveFileDialog
    }));
    const success = await Promise.all(operations.map(op => api.moveItems(op)));
    if (success.every(s => s)) {
      const movedPaths = itemsToMove.map(item => item.path);
      setItems(prev => prev.filter(item => !movedPaths.includes(item.path)));
      showNotification('success', `Moved ${itemsToMove.length} item(s) successfully`);
    } else {
      showNotification('error', 'Failed to move some items');
    }
  } catch (error) {
    console.error('Error in handleMoveConfirm:', error);
    showNotification('error', 'Failed to move items');
  } finally {
    setMoveDialogOpen(false);
    setItemsToMove([]);
  }
};

  const handleDownload = async (path: string) => {
    try {
      const blob = await api.downloadItem(path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = path.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('success', 'Download started');
    } catch (error) {
      showNotification('error', 'Failed to start download');
    }
  };

  const handleZip = async (folderPath: string) => {
    try {
      const downloadUrl = await api.zipFolder(folderPath);
      window.open(downloadUrl, '_blank');
      showNotification('success', 'Folder zipped and download started');
      // Refresh folder contents to show the new ZIP file
      await fetchDriveData(currentFolderId || driveId!);
    } catch (error) {
      showNotification('error', 'Failed to zip folder');
    }
  };

  const getFileStats = () => {
    const files = items.filter(item => item.type === 'file');
    const folders = items.filter(item => item.type === 'folder');
    const totalItems = items.length;
    const largestItem = items.reduce((largest, item) => 
      item.size > largest.size ? item : largest, items[0] || { size: 0 }
    );

    return { files: files.length, folders: folders.length, totalItems, largestItem };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full mt-4 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Drive not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = getFileStats();

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-20 right-4 z-40 p-4 rounded-lg shadow-lg border ${
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackClick}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{currentFolderId ? 'Back to Parent' : 'Back to Dashboard'}</span>
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              drive.usagePercentage >= 80 ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <HardDrive className={`h-6 w-6 ${
                drive.usagePercentage >= 80 ? 'text-red-600' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-2xl font-bold text-gray-900">
                <span
                  className="cursor-pointer hover:underline"
                  onClick={() => handleBreadcrumbClick(driveId!)}
                >
                  {drive.label}
                </span>
                {path.map((segment, index) => (
                  <span key={segment.id} className="flex items-center">
                    <span className="mx-2">{'>'}</span>
                    <span
                      className={index === path.length - 1 ? '' : 'cursor-pointer hover:underline'}
                      onClick={() => index < path.length - 1 && handleBreadcrumbClick(segment.id)}
                    >
                      {segment.name}
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-gray-600">Drive contents and management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Usage</p>
              <p className={`text-2xl font-bold ${getUsageTextColor(drive.usagePercentage)}`}>
                {drive.usagePercentage.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(drive.usagePercentage)}`}
                style={{ width: `${drive.usagePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatBytes(drive.usedSpace)}</span>
              <span>{formatBytes(drive.totalSize)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <File className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats.files} files, {stats.folders} folders
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Free Space</p>
              <p className="text-2xl font-bold text-green-600">{formatBytes(drive.freeSpace)}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <HardDrive className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Available for new files
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Largest Item</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.largestItem ? formatBytes(stats.largestItem.size) : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Folder className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500 truncate">
            {stats.largestItem?.name || 'No items'}
          </div>
        </div>
      </div>

      {drive.usagePercentage >= 80 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Storage Alert</h4>
              <p className="text-sm text-red-700">
                This drive is {drive.usagePercentage.toFixed(1)}% full. Consider cleaning up or moving files to free up space.
              </p>
            </div>
          </div>
        </div>
      )}

      <FileTable
        items={items}
        onDelete={handleDelete}
        onMove={handleMove}
        onDownload={handleDownload}
        onFolderClick={handleFolderClick}
        onZip={handleZip}
        isLoading={isLoading}
      />

      <MoveFileDialog
        isOpen={moveDialogOpen}
        onClose={() => setMoveDialogOpen(false)}
        items={itemsToMove}
        onConfirm={handleMoveConfirm}
      />
    </div>
  );
};

export default DriveDetails;