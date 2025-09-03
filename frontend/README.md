# Solar Panel Production Tracking PWA

A Progressive Web App (PWA) for solar panel production tracking in manufacturing environments.

## Features

- **PWA Support**: Installable app with offline capabilities
- **Touch-Optimized**: Designed for tablet use on production floors
- **Offline-First**: Works without internet connection
- **Barcode Scanning**: Integrated barcode scanning functionality
- **Real-time Updates**: Live production data and status
- **Responsive Design**: Works on tablets, laptops, and desktops

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Headless UI** for accessible components
- **Heroicons** for icons
- **Workbox** for service worker management
- **Dexie.js** for offline storage (coming soon)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### PWA Features

- **Service Worker**: Automatic caching and offline support
- **App Manifest**: Installable as a native app
- **Background Sync**: Syncs data when connection is restored
- **Push Notifications**: Real-time updates (coming soon)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout with navigation
│   └── OfflineIndicator.tsx
├── pages/              # Page components
│   ├── Dashboard.tsx   # Production overview
│   ├── PanelScan.tsx   # Barcode scanning
│   ├── Inspections.tsx # Inspection history
│   └── Settings.tsx    # System configuration
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── App.tsx             # Main app component
└── index.css           # Global styles with Tailwind
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run pwa:build` - Build with PWA optimizations
- `npm run pwa:preview` - Preview PWA build

### PWA Configuration

The PWA is configured in `vite.config.ts` with:

- **Service Worker**: Automatic registration and updates
- **App Manifest**: Installable app configuration
- **Caching Strategy**: Network-first for API, cache-first for assets
- **Offline Support**: Graceful degradation when offline

## Production Floor Features

### Touch-Optimized Interface

- Large touch targets (44px minimum)
- Swipe gestures for navigation
- High contrast colors for industrial environments
- Responsive design for various tablet sizes

### Offline Capabilities

- Local data storage with IndexedDB
- Background sync when connection restored
- Offline-first design patterns
- Data integrity and conflict resolution

### Barcode Scanning

- Support for multiple scanner types
- Manual entry fallback
- Real-time validation
- Error handling and retry logic

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## License

MIT License - see LICENSE file for details

## Security Dashboard (Task 22.6)

- Dev credentials (no DB required):
  - admin1 / password123 (SYSTEM_ADMIN)
  - supervisor1 / password123
  - inspector1 / password123
  - qcmanager1 / password123

- Frontend env:
  - Create `.env` with `VITE_API_URL=http://localhost:3000`
  - Restart `npm run dev`

- Live indicator meanings:
  - Green • "Live": SSE connected
  - Yellow • "Connecting…": attempting to connect/reconnect
  - Red • "Error": connection dropped; auto-retrying with backoff

- Troubleshooting:
  - Ensure backend running on port 3000
  - Check Network: `/api/v1/security-events` (200 JSON), `/api/v1/security-events/stream` (pending)
