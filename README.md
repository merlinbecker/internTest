# Intern Test PWA

Progressive Web App shell based on Azure Functions mit JavaScript, die folgende Features bietet:

## ✨ Features

### 🌐 Webseite
- ✅ Einfache, responsive Webseite auf der "/" Route
- ✅ Modernes Design mit Gradient-Hintergrund
- ✅ Mobile-optimiert mit PWA-Fähigkeiten

### 📡 Request Capturing
- ✅ Vollständige Erfassung aller GET-Requests
- ✅ Anzeige aller HTTP-Headers auf der Webseite
- ✅ Timestamp und Client-Informationen
- ✅ JSON-formatierte Ausgabe

### ⌨️ Event Capturing
- ✅ Erfassung aller Keyboard-Eingaben (keydown/keyup)
- ✅ Maus-Events (click, move, down, up)
- ✅ Touch-Events für mobile Geräte
- ✅ Scroll-Events
- ✅ Live-Anzeige im Event-Log mit Timestamps

### 📷 Kamera-Funktionalität
- ✅ Camera API Integration
- ✅ Live-Video-Preview
- ✅ Foto-Aufnahme-Funktion
- ✅ Fehlerbehandlung für Camera-Zugriff
- ✅ Status-Anzeige

### 📱 Progressive Web App
- ✅ PWA Manifest für Installation
- ✅ Service Worker für Offline-Funktionalität
- ✅ App-Installation möglich
- ✅ Icon-Set für verschiedene Geräte
- ✅ Background Sync und Push Notifications vorbereitet

## 🚀 Installation und Start

```bash
# Dependencies installieren
npm install

# Server starten
npm start
```

Die App läuft dann auf `http://localhost:3000`

## 📁 Projektstruktur

```
├── package.json                 # NPM Konfiguration
├── server.js                    # Express Server (für lokale Entwicklung)
├── host.json                    # Azure Functions Host Konfiguration
├── src/
│   ├── functions/
│   │   └── httpTrigger1.js      # Azure Function HTTP Trigger
│   └── static/
│       ├── index.html           # Haupt-HTML-Seite
│       ├── app.js               # Client-seitiges JavaScript
│       ├── manifest.json        # PWA Manifest
│       ├── sw.js                # Service Worker
│       └── icon-*.png           # PWA Icons
```

## 🔧 Azure Functions Deployment

Für die Bereitstellung in Azure Functions:

1. Azure Functions Core Tools installieren
2. `func init` und `func start` verwenden
3. Die `src/functions/httpTrigger1.js` wird als HTTP Trigger dienen

## 🌟 Demo

![PWA Screenshot](https://github.com/user-attachments/assets/1bf7e464-82a9-45b6-96d2-8d9ced629ba5)

Die App zeigt:
- **Request Information**: Alle HTTP-Headers und Request-Details
- **Event Capturing**: Live-Tracking von Benutzerinteraktionen
- **Camera**: Kamera-Zugriff und Foto-Aufnahme
- **PWA Status**: Service Worker und Installationsstatus

## 📝 Technische Details

- **Frontend**: Vanilla JavaScript, CSS Grid/Flexbox
- **Backend**: Azure Functions v4 (oder Express.js für lokale Entwicklung)
- **PWA**: Service Worker, Web App Manifest
- **APIs**: Camera API, Event Listeners, Request Headers
- **Responsive**: Mobile-First Design

Das Projekt erfüllt alle Anforderungen aus der Spezifikation und bietet eine vollständige PWA-Erfahrung.
