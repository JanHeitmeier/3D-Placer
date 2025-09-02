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
      await this.createDir(parentDir); 
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
      await this.createDir(parentDir);
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
    try {
      const parentDir = path.substring(0, path.lastIndexOf('/'));
      if (parentDir) {
        await this.createDir(parentDir);
      }

      try {
        await this.deleteFile(path);
        console.log(`Removed existing file at ${path}`);

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.log(e);
      }

      await Filesystem.writeFile({
        path: path,
        data: data,
        directory: Directory.Data
      });

      console.log(`File saved successfully to ${path}`);
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

  async downloadAndSaveImage(url: string, destinationPath: string): Promise<void> {
    try {
      const parentDir = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
      if (parentDir) {
        await this.createDir(parentDir);
      }

      const response = await fetch(url);
      const blob = await response.blob();

      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      await this.saveBase64(destinationPath, base64Data);
      console.log(`Image downloaded and saved to ${destinationPath}`);
    } catch (e) {
      console.error(`Error downloading and saving image from ${url}:`, e);
      throw e;
    }
  }

  async saveBase64Image(dataUrl: string, path: string): Promise<void> {
    try {
      const base64Data = dataUrl.split(',')[1];
      
      const parentDir = path.substring(0, path.lastIndexOf('/'));
      if (parentDir) {
        await this.createDir(parentDir);
      }

      await Filesystem.writeFile({
        path: path,
        data: base64Data,
        directory: Directory.Data
      });

      console.log('Base64 image saved successfully:', path);
    } catch (error) {
      console.error('Error saving base64 image:', error);
      throw error;
    }
  }
}
