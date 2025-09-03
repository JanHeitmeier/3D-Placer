import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';

export interface AppSettings {
    darkMode: boolean;
    gridSize: number;
}

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private readonly SETTINGS_KEY = 'app-settings.json';
    private defaultSettings: AppSettings = {
        darkMode: false,
        gridSize: 10
    };

    private settingsSubject = new BehaviorSubject<AppSettings>(this.defaultSettings);
    public settings$ = this.settingsSubject.asObservable();

    constructor(private storageService: StorageService) {
        this.loadSettings();
    }

    private async loadSettings(): Promise<void> {
        try {
            const storedSettings = await this.storageService.readJSON(this.SETTINGS_KEY);
            if (storedSettings) {
                const settings = { ...this.defaultSettings, ...storedSettings };
                this.settingsSubject.next(settings);
                this.applyTheme(settings.darkMode);
            }
        } catch (error) {
            console.warn('Error loading settings:', error);
        }
    }

    async updateSettings(settings: Partial<AppSettings>): Promise<void> {
        const currentSettings = this.settingsSubject.getValue();
        const updatedSettings = { ...currentSettings, ...settings };

        this.settingsSubject.next(updatedSettings);
        await this.storageService.saveJSON(this.SETTINGS_KEY, updatedSettings);


        if (settings.darkMode !== undefined) {
            this.applyTheme(settings.darkMode);
        }
    }

    private applyTheme(darkMode: boolean): void {
        document.body.classList.toggle('dark', darkMode);
    }

    getCurrentSettings(): AppSettings {
        return this.settingsSubject.getValue();
    }
    async resetSettings(): Promise<void> {
        this.settingsSubject.next(this.defaultSettings);
        await this.storageService.saveJSON(this.SETTINGS_KEY, this.defaultSettings);
        this.applyTheme(this.defaultSettings.darkMode);
    }
}