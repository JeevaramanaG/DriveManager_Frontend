import { Drive, FileSystemItem } from "../types";

let EXPRESS_HOST = window.location.hostname; // Default host for Express server
let BASE_URL = 'http://localhost:8080/api'; // Default to localhost for development
let ipPollingInterval: number | null = null;
fetchLocalIp();

// Fetch local IP from Express and update BASE_URL
export async function fetchLocalIp(force: boolean = false): Promise<void> {
  try {
    //  First check localStorage unless force is true
    const cachedIp = localStorage.getItem('localIp');
    if (cachedIp && !force) {
      updateBaseUrl(cachedIp);
      console.log('[INFO] Using cached local IP:', cachedIp);
      return;
    }

    console.log('[INFO] Fetching local IP from Express server...');
    const response = await fetch(`http://${EXPRESS_HOST}:5174/local-ip`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Failed to fetch local IP');

    const data = await response.json();
    const localIp = data.localIp;

    if (localIp) {
      localStorage.setItem('localIp', localIp); // Save IP in localStorage
      updateBaseUrl(localIp);
      console.log('[INFO] BASE_URL updated to:', BASE_URL);

      // Stop polling after successful fetch
      if (ipPollingInterval) {
        clearInterval(ipPollingInterval);
        ipPollingInterval = null;
        console.log('[INFO] IP polling stopped (IP stored in localStorage)');
      }
    }
  } catch (error) {
    console.error('[ERROR] Could not fetch local IP:', error);
  }
}

// Helper: update BASE_URL
function updateBaseUrl(ip: string) {
  const url = new URL(BASE_URL);
  url.hostname = ip;
  BASE_URL = url.toString();
}

// Start polling Express every 30 seconds (only if no IP in storage)
export function startIpPolling(intervalMs: number = 30000) {
  const cachedIp = localStorage.getItem('localIp');
  if (cachedIp) {
    updateBaseUrl(cachedIp);
    console.log('[INFO] Found cached IP, using it:', cachedIp);
    return; // ✅ Don’t start polling
  }
  // Keep polling until IP is fetched
  ipPollingInterval = window.setInterval(() => fetchLocalIp(), intervalMs);
}


export const api = {
  async getDrives(): Promise<Drive[]> {
    const res = await fetch(`${BASE_URL}/drives`);
    if (!res.ok) throw new Error('Failed to fetch drives');
    return await res.json();
  },

  async getDriveContents(path: string): Promise<FileSystemItem[]> {
    const encodedPath = encodeURIComponent(path);
    const res = await fetch(`${BASE_URL}/drive/${encodedPath}`);
    if (!res.ok) throw new Error('Failed to fetch drive contents');
    return await res.json();
  },

  async getDirectoryItems(path: string): Promise<FileSystemItem[]> {
    const response = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch directory items: ${response.statusText}`);
    }

    return await response.json() as FileSystemItem[];
  },

  async deleteItem(path: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path })
      });
      if (!res.ok) throw new Error('Failed to delete item');
      const { success } = await res.json();
      return success;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  async moveItems(operation: { source: string; destination: string }): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'moveItem', ...operation })
      });
      if (!res.ok) throw new Error('Failed to move items');
      const { success } = await res.json();
      return success;
    } catch (error) {
      console.error('Error moving items:', error);
      throw error;
    }
  },

  async downloadItem(path: string): Promise<Blob> {
    try {
      const res = await fetch(`${BASE_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error(`Error downloading file: ${res.statusText}`);
      return await res.blob();
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  },

  async zipFolder(folderPath: string): Promise<string> {
    try {
      const res = await fetch(`${BASE_URL}/zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'zipFolder', path: folderPath })
      });
      if (!res.ok) throw new Error('Failed to zip folder');
      const { success } = await res.json();
      if (!success) throw new Error('Failed to zip folder');

      // Fetch parent folder contents to find the new ZIP file
      const parentPath = folderPath.substring(0, folderPath.lastIndexOf('/')) || folderPath;
      const contents = await api.getDriveContents(parentPath);
      const folderName = folderPath.split('/').pop();
      const zipFile = contents.find(item => item.name === `${folderName}.zip` && item.type === 'file');
      if (!zipFile) throw new Error('ZIP file not found');

      return `${BASE_URL}/download?path=${encodeURIComponent(zipFile.path)}`;
    } catch (error) {
      console.error('Error zipping folder:', error);
      throw error;
    }
  }
};
