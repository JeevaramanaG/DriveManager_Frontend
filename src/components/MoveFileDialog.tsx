import React, { useState, useEffect } from "react";
import { FileSystemItem, Drive } from "../types";
import { api } from "../services/api";
import { formatBytes } from "../utils/formatters";
import { X, Move, HardDrive, AlertCircle, Folder, ArrowUp } from "lucide-react";

interface MoveFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: FileSystemItem[];
  onConfirm: (destinationDrive: string, basePath: string, items: FileSystemItem[]) => void;
}

const MoveFileDialog: React.FC<MoveFileDialogProps> = ({
  isOpen,
  onClose,
  items,
  onConfirm,
}) => {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [directoryItems, setDirectoryItems] = useState<FileSystemItem[]>([]);
  const [isLoadingDrives, setIsLoadingDrives] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDrives();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDrive) {
      const drive = drives.find((d) => d.id === selectedDrive);
      const rootPath = drive ? `${drive.id}/` : "";
      setCurrentPath(rootPath);
      if (rootPath) {
        fetchDirectoryItems(rootPath);
      } else {
        setDirectoryItems([]);
        setError(null);
      }
    } else {
      setCurrentPath("");
      setDirectoryItems([]);
      setError(null);
    }
  }, [selectedDrive, drives]);

  const fetchDrives = async () => {
    try {
      setIsLoadingDrives(true);
      setError(null);
      const driveData = await api.getDrives();
      if (!Array.isArray(driveData)) {
        throw new Error("Invalid drives data");
      }
      setDrives(driveData);
    } catch (error: any) {
      console.error("Failed to fetch drives:", error);
      setError(error.message || "Failed to load drives");
    } finally {
      setIsLoadingDrives(false);
    }
  };

  const fetchDirectoryItems = async (path: string) => {
    if (!path || typeof path !== "string") {
      setError("Invalid path provided");
      setDirectoryItems([]);
      setIsLoadingFolders(false);
      return;
    }
    try {
      setIsLoadingFolders(true);
      setError(null);
      console.log("Fetching items for path:", path);
      const normalizedPath = path.replace(/\\/g, "/").replace(/\/+/g, "/");
      const items = await api.getDirectoryItems(normalizedPath);
      if (!Array.isArray(items)) {
        throw new Error("Invalid directory items data");
      }
      console.log("Raw API response:", items);

      const mappedFolders = items
        .filter((item) => item.type === "folder")
        .map(
          (item) =>
            ({
              id: item.name, // Use name as unique ID
              name: item.name,
              path: normalizedPath.endsWith("/")
                ? `${normalizedPath}${item.name}`
                : `${normalizedPath}/${item.name}`,
              type: "folder" as const,
              size: item.size || 0,
              lastModified: "", // Default, since API doesn't provide this
            } as FileSystemItem)
        );

      console.log("Mapped folders:", mappedFolders);
      setDirectoryItems(mappedFolders);
    } catch (error: any) {
      console.error("Failed to fetch directory items:", error);
      setError(error.message || "Failed to load folders");
      setDirectoryItems([]);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleConfirm = async () => {
  if (!selectedDrive || !currentPath) {
    setError('No destination selected');
    return;
  }

  setIsLoadingFolders(true);
  try {
    const normalizedPath = currentPath.replace(/\\/g, '/').replace(/\/+/g, '/');
    const basePath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
    console.log('Move payload base path:', basePath);
    await onConfirm(selectedDrive, basePath, items); // Pass basePath and items
    onClose();
  } catch (error: any) {
    console.error('Move operation failed:', error);
    setError(error.message || 'Failed to move items');
  } finally {
    setIsLoadingFolders(false);
  }
};

  const getTotalSize = () => {
    return items.reduce((total, item) => total + (item.size || 0), 0);
  };

  const getDestinationDrive = () => {
    return drives.find((drive) => drive.id === selectedDrive);
  };

  const canMove = () => {
    const destinationDrive = getDestinationDrive();
    if (!destinationDrive || !currentPath) return false;
    const totalSize = getTotalSize();
    const normalizedCurrentPath = currentPath
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/");
    const isSameLocation = items.some(
      (item) =>
        item.path.replace(/\\/g, "/").replace(/\/+/g, "/") ===
        normalizedCurrentPath
    );
    return destinationDrive.freeSpace >= totalSize && !isSameLocation;
  };

  const handleFolderClick = (folder: FileSystemItem) => {
    if (!folder?.path || !folder?.name) {
      console.error("Invalid folder object:", folder);
      setError("Invalid folder selected");
      return;
    }

    const normalizedPath = folder.path.replace(/\\/g, "/").replace(/\/+/g, "/");
    const newPath = normalizedPath.endsWith("/")
      ? normalizedPath
      : `${normalizedPath}/`;

    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      // Double-click: navigate into the folder
      console.log("Double-click: Navigating to folder:", newPath);
      setCurrentPath(newPath);
      fetchDirectoryItems(newPath);
    } else {
      // Single-click: set as destination path
      console.log("Single-click: Setting destination path:", newPath);
      setClickTimeout(
        setTimeout(() => {
          setCurrentPath(newPath);
          fetchDirectoryItems(newPath); // Fetch items for single-click to update UI
          setClickTimeout(null);
        }, 300)
      );
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    try {
      const newPath =
        currentPath
          .split("/")
          .filter((segment) => segment)
          .slice(0, index + 1)
          .join("/") + "/";
      console.log("Breadcrumb navigation to:", newPath);
      setCurrentPath(newPath);
      fetchDirectoryItems(newPath);
    } catch (error: any) {
      console.error("Breadcrumb navigation failed:", error);
      setError("Failed to navigate to parent folder");
    }
  };

  const handleParentDirectory = () => {
    try {
      const segments = currentPath.split("/").filter((segment) => segment);
      if (segments.length > 1) {
        segments.pop();
        const newPath = segments.join("/") + "/";
        console.log("Navigating to parent:", newPath);
        setCurrentPath(newPath);
        fetchDirectoryItems(newPath);
      }
    } catch (error: any) {
      console.error("Parent navigation failed:", error);
      setError("Failed to navigate to parent folder");
    }
  };

  if (!isOpen) return null;

  const pathSegments = currentPath
    ? currentPath.split("/").filter((segment) => segment)
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Move className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Move Items
              </h3>
              <p className="text-sm text-gray-500">
                Select destination drive and folder for {items.length} item(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div
              className="bg-red-50 text-red-700 p-3 rounded-lg text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Items to Move */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Items to move:
            </h4>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-gray-700 truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatBytes(item.size || 0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Total size:{" "}
              <span className="font-medium">{formatBytes(getTotalSize())}</span>
            </div>
          </div>

          {/* Destination Drive Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Select destination drive:
            </h4>
            {isLoadingDrives ? (
              <div className="text-sm text-gray-500 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Loading drives...
              </div>
            ) : (
              <div className="space-y-2">
                {drives.length > 0 ? (
                  drives.map((drive) => {
                    const hasEnoughSpace = drive.freeSpace >= getTotalSize();
                    return (
                      <div
                        key={drive.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedDrive === drive.id
                            ? "border-blue-500 bg-blue-50"
                            : hasEnoughSpace
                            ? "border-gray-200 hover:border-gray-300"
                            : "border-red-200 bg-red-50 cursor-not-allowed"
                        }`}
                        onClick={() =>
                          hasEnoughSpace && setSelectedDrive(drive.id)
                        }
                        role="button"
                        aria-label={`Select drive ${drive.label}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-lg ${
                                hasEnoughSpace ? "bg-blue-100" : "bg-red-100"
                              }`}
                            >
                              <HardDrive
                                className={`h-4 w-4 ${
                                  hasEnoughSpace
                                    ? "text-blue-600"
                                    : "text-red-600"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {drive.label}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatBytes(drive.freeSpace)} free of{" "}
                                {formatBytes(drive.totalSize)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!hasEnoughSpace && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <input
                              type="radio"
                              name="destinationDrive"
                              value={drive.id}
                              checked={selectedDrive === drive.id}
                              disabled={!hasEnoughSpace}
                              onChange={() => setSelectedDrive(drive.id)}
                              className="text-blue-600 focus:ring-blue-500"
                              aria-checked={selectedDrive === drive.id}
                            />
                          </div>
                        </div>
                        {!hasEnoughSpace && (
                          <div className="mt-2 text-xs text-red-600">
                            Not enough free space
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">
                    No drives available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Destination Folder Selection */}
          {selectedDrive && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Select destination folder:
              </h4>
              {/* Selected Destination Path */}
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-2 mb-3 text-sm text-gray-700">
                Selected Path: {currentPath || "None"}
              </div>
              {/* Breadcrumb Navigation */}
              <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3 flex-wrap">
                {pathSegments.map((segment, index) => (
                  <div key={index} className="flex items-center">
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="hover:text-blue-600 focus:outline-none focus:underline"
                      aria-label={`Navigate to ${segment}`}
                    >
                      {segment}
                    </button>
                    {index < pathSegments.length - 1 && (
                      <span className="mx-1">/</span>
                    )}
                  </div>
                ))}
                {pathSegments.length > 1 && (
                  <button
                    onClick={handleParentDirectory}
                    className="ml-2 text-blue-600 hover:text-blue-800 flex items-center text-sm"
                    aria-label="Navigate to parent directory"
                  >
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Parent
                  </button>
                )}
              </div>
              {/* Folder List */}
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {isLoadingFolders ? (
                  <div className="text-sm text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                    Loading folders...
                  </div>
                ) : directoryItems.length > 0 ? (
                  directoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between py-1 cursor-pointer rounded ${
                        currentPath === item.path
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleFolderClick(item);
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        handleFolderClick(item);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleFolderClick(item);
                        }
                      }}
                      aria-label={`Select folder ${item.name}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatBytes(item.size || 0)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">
                    No folders available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Cancel move operation"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canMove() || isLoadingFolders}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            aria-label="Confirm move operation"
          >
            {isLoadingFolders ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Move className="h-4 w-4" />
            )}
            <span>{isLoadingFolders ? "Moving..." : "Move Items"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveFileDialog;
