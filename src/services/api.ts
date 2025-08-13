import { Drive, FileSystemItem} from "../types";

const BASE_URL = 'http://localhost:8080/api';

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

 async getDirectoryItems (path: string): Promise<FileSystemItem[]>{
    const response = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch directory items: ${response.statusText}`);
    }

    const data = await response.json();
    return data as FileSystemItem[];
  },

  async deleteItem(path: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ path })  // send path in JSON body
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
      console.log('moveItems operation:', operation);
      const res = await fetch(`${BASE_URL}/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'moveItem', ...operation })
      });
      console.log('API request body:', JSON.stringify({ action: 'moveItem', ...operation }));
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
    const url = `${BASE_URL}/download`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      throw new Error(`Error downloading file: ${response.statusText}`);
    }

    const blob = await response.blob();
    return blob;
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