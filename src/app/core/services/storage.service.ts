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
      try {
        await Filesystem.mkdir({
          path: parentDir,
          directory: Directory.Data,
          recursive: true,
        });
      } catch (e) {
        console.error('Unable to create directory', e);
      }
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
      try {
        await Filesystem.mkdir({
          path: parentDir,
          directory: Directory.Data,
          recursive: true,
        });
      } catch (e) {
        console.error('Unable to create directory', e);
      }
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
      // Ignore error if directory already exists. Capacitor may return different
      // error shapes/messages depending on platform. Check for common indicators.
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

    await Filesystem.writeFile({
      path: path,
      data: data,
      directory: Directory.Data
    });
  }
}
