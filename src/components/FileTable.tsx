import React, { useState } from 'react';
import { FileSystemItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from '../utils/formatters';
import {
  File,
  Folder,
  Download,
  Trash2,
  Move,
  MoreVertical,
  SortAsc,
  SortDesc,
  Archive
} from 'lucide-react';

interface FileTableProps {
  items: FileSystemItem[];
  onDelete: (path: string) => void; // Updated to use path
  onMove: (items: FileSystemItem[]) => void;
  onDownload: (path: string) => void; // Updated to use path
  onFolderClick: (folderId: string, folderName: string) => void;
  onZip: (folderPath: string) => void; // Updated to use path
  isLoading?: boolean;
}

type SortKey = 'name' | 'size' | 'lastModified' | 'type';
type SortOrder = 'asc' | 'desc';

const FileTable: React.FC<FileTableProps> = ({
  items,
  onDelete,
  onMove,
  onDownload,
  onFolderClick,
  onZip,
  isLoading = false
}) => {
  const { isAdmin } = useAuth();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('size');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aValue: any = a[sortKey];
    let bValue: any = b[sortKey];

    if (sortKey === 'lastModified') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleBulkMove = () => {
    const itemsToMove = items.filter(item => selectedItems.includes(item.id));
    onMove(itemsToMove);
    setSelectedItems([]);
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? (
      <SortAsc className="h-4 w-4" />
    ) : (
      <SortDesc className="h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {isAdmin && selectedItems.length > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedItems.length} item(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkMove}
                className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Move className="h-4 w-4" />
                <span>Move Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {isAdmin && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === items.length && items.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('size')}
              >
                <div className="flex items-center space-x-1">
                  <span>Size</span>
                  {getSortIcon('size')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('lastModified')}
              >
                <div className="flex items-center space-x-1">
                  <span>Last Modified</span>
                  {getSortIcon('lastModified')}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {isAdmin && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {item.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-blue-500" />
                    ) : (
                      <File className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div
                    className={`text-sm font-medium text-gray-900 ${
                      item.type === 'folder' ? 'cursor-pointer text-blue-600 hover:underline' : ''
                    }`}
                    onClick={() => item.type === 'folder' && onFolderClick(item.id, item.name)}
                  >
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-500">{item.path}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatBytes(item.size)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(item.lastModified).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === item.id ? null : item.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                      aria-label={`Actions for ${item.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {actionMenuOpen === item.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          {item.type === 'file' && (
                          <button
                            onClick={() => {
                              onDownload(item.path);
                              setActionMenuOpen(null);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                          )}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  onMove([item]);
                                  setActionMenuOpen(null);
                                }}
                                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Move className="h-4 w-4" />
                                <span>Move</span>
                              </button>
                              <button
                                onClick={() => {
                                  onDelete(item.path);
                                  setActionMenuOpen(null);
                                }}
                                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                              {item.type === 'folder' && (
                                <button
                                  onClick={() => {
                                    onZip(item.path);
                                    setActionMenuOpen(null);
                                  }}
                                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Archive className="h-4 w-4" />
                                  <span>Zip</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="p-8 text-center">
          <File className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No files or folders found</p>
        </div>
      )}
    </div>
  );
};

export default FileTable;