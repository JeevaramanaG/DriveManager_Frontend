export interface Drive {
  id: string;
  label: string;
  totalSize: number;
  usedSpace: number;
  freeSpace: number;
  usagePercentage: number;
  type: 'local' | 'removable';
}

export interface FileSystemItem {
  id: string;
  name: string;
  size: number;
  type: 'file' | 'folder';
  lastModified: string;
  path: string;
  extension?: string;
}


export interface User {
  id: string;
  username: string;
  role: 'admin' | 'viewer';
  email: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export interface Alert {
  id: string; // e.g., driveId + date
  driveId: string; // e.g., "C"
  driveName: string; // e.g., "Local Disk (C:)"
  usagePercentage: number; // e.g., 85.5
  severity: 'critical' | 'warning'; // critical if >= threshold, warning if >= threshold - 10
  timestamp: string; // ISO string, e.g., "2025-08-06T18:54:00Z"
  threshold: number; // Drive-specific threshold, e.g., 80
}

export interface MoveOperation {
  sourceItems: FileSystemItem[];
  destinationDrive: string;
  destinationPath?: string;
}

