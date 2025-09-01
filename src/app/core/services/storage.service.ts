import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor() { }

  async saveJSON(path: string, data: any): Promise<void> {
    const parentDir = path.substring(0, path.lastIndexOf('/'));
    if (parentDir) {
      await this.createDir(parentDir); // Use the createDir method instead
    }

    await Filesystem.writeFile({
      path: path,
      data: JSON.stringify(data),
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
  }

  async readJSON(path: string): Promise<any> {
    try {
      const result = await Filesystem.readFile({
        path: path,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      return JSON.parse(result.data as string);
    } catch (e) {
      return null;
    }
  }

  async copyFile(sourceUri: string, destinationPath: string): Promise<void> {
    const parentDir = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
    if (parentDir) {
      await this.createDir(parentDir); // Use the createDir method instead
    }

    await Filesystem.copy({
      from: sourceUri,
      to: destinationPath,
      toDirectory: Directory.Data
    });
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await Filesystem.stat({
        path: path,
        directory: Directory.Data
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async createDir(path: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: path,
        directory: Directory.Data,
        recursive: true
      });
    } catch (e: any) {
      const msg = (e && (e.message || e.error || '')).toString();
      const code = e && e.code;
      if (msg.toLowerCase().includes('already exists') || code === 'OS-PLUG-FILE-0010') {
        // expected, ignore
        return;
      }
      throw e;
    }
  }

  async saveBase64(path: string, data: string): Promise<void> {
    const parentDir = path.substring(0, path.lastIndexOf('/'));
    if (parentDir) {
      await this.createDir(parentDir);
    }

    try {
      // Make sure the path is clear before writing
      try {
        const stat = await Filesystem.stat({
          path: path,
          directory: Directory.Data
        });
        
        // If this is a directory, delete it first
        if (stat.type === 'directory') {
          console.log(`Found directory instead of file at ${path}, removing it...`);
          try {
            await Filesystem.rmdir({
              path: path,
              directory: Directory.Data,
              recursive: true
            });
            // Wait a short time to ensure filesystem operations complete
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (rmError) {
            console.error(`Failed to remove directory at ${path}:`, rmError);
            
            // Try an alternative approach - create a different filename
            const pathParts = path.split('.');
            const basePath = pathParts.slice(0, -1).join('.');
            const extension = pathParts.length > 1 ? `.${pathParts[pathParts.length - 1]}` : '';
            path = `${basePath}_${Date.now()}${extension}`;
            console.log(`Using alternative path: ${path}`);
          }
        }
      } catch (e) {
        // Path doesn't exist, which is fine
      }

      // Now write the file
      await Filesystem.writeFile({
        path: path,
        data: data,
        directory: Directory.Data
      });
    } catch (e) {
      console.error(`Error saving file to ${path}:`, e);
      throw e;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: path,
        directory: Directory.Data
      });
    } catch (e) {
      console.warn(`Could not delete file at ${path}:`, e);
    }
  }

}
