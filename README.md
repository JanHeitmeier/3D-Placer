# 3D‑Placer
A lightweight Angular and Capacitor-based application for viewing, placing, and interacting with 3D models on mobile devices.  
The project integrates a model viewer, gallery loading, and API-driven texxture asset retrevial to provide a streamlined workflow for displaying and positioning 3D content using ThreeJS.

## Features
- Interactive 3D model viewer  
- Gallery loading and asset management  
- API integration for dynamic model retrieval  
- Mobile-ready through Capacitor  
- Clean UI with responsive feedback  
- TypeScript-based architecture

## Technology Stack
- Angular  
- TypeScript  
- Capacitor  
- SCSS  
- HTML

## Project Structure
3D-Placer/  
├── android/               Android platform integration  
├── resources/             App resources and assets  
├── src/                   Angular application source code  
│   ├── app/               Components, services, modules  
│   ├── assets/            Static assets  
│   └── environments/      Environment configurations  
├── angular.json           Angular workspace configuration  
├── capacitor.config.ts    Capacitor configuration  
├── package.json           Dependencies and scripts  
└── tsconfig*.json         TypeScript configuration files

## Installation
```
git clone https://github.com/JanHeitmeier/3D-Placer
npm install
ng serve
ng build
```

## Running on Mobile (Capacitor)
```
ng build
npx cap sync
npx cap open android

```
# Deutsche Version

# 3D‑Placer
Eine leichtgewichtige Angular- und Capacitor-Anwendung zum Anzeigen, Platzieren und Interagieren mit 3D‑Modellen auf mobilen Geräten.  
Das Projekt kombiniert einen Model Viewer, Galerie-Ladevorgänge und API‑gestütztes Texture-Loading, um einen effizienten Workflow für die Darstellung und Positionierung von 3D‑Inhalten mithilfe von ThreeJS zu ermöglichen.

## Funktionen
- Interaktiver 3D‑Model Viewer  
- Galerie-Laden und Asset-Verwaltung  
- API‑Integration für dynamische Modellabfragen  
- Mobilfähig durch Capacitor  
- Aufgeräumte Benutzeroberfläche mit responsivem Feedback  
- Architektur auf Basis von TypeScript

## Technologie-Stack
- Angular  
- TypeScript  
- Capacitor  
- SCSS  
- HTML

## Projektstruktur
3D-Placer/  
├── android/               Android-Integration  
├── resources/             App-Ressourcen und Assets  
├── src/                   Angular-Quellcode  
│   ├── app/               Komponenten, Services, Module  
│   ├── assets/            Statische Assets  
│   └── environments/      Umgebungs-Konfigurationen  
├── angular.json           Angular-Konfiguration  
├── capacitor.config.ts    Capacitor-Konfiguration  
├── package.json           Abhängigkeiten und Skripte  
└── tsconfig*.json         TypeScript-Konfigurationen

## Installation
```
git clone https://github.com/JanHeitmeier/3D-Placer
npm install
ng serve
ng build
```

## Ausführung auf mobilen Geräten (Capacitor)
```
ng build
npx cap sync
npx cap open android
```
