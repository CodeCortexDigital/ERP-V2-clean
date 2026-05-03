# ERP V2 Frontend

A modern, responsive ERP (Enterprise Resource Planning) frontend built with React, TypeScript, Vite, and TailwindCSS.

## Features

- **Multi-Module Architecture**: Dashboard, Accounts, Tenants, Inventory, Finance, HR, Reports, Analytics, Education, CRM, Commerce, AI, SCM, Business, Documents, Settings
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Interactive charts and dashboards with drill-down capabilities
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Type Safety**: Full TypeScript implementation
- **Code Splitting**: Lazy loading for optimal performance

## Tech Stack

- **Framework**: React 18.3.1
- **Language**: TypeScript 5.x
- **Build Tool**: Vite 5.4.21
- **Styling**: TailwindCSS 3.4.14
- **State Management**: Zustand
- **Routing**: React Router 6
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_API_PREFIX=/api

# WebSocket Configuration
VITE_WS_URL=ws://localhost:8000

# App Configuration
VITE_APP_NAME=ERP V2
VITE_APP_VERSION=2.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AI=true
VITE_ENABLE_WEBSOCKET=true

# Pagination
VITE_DEFAULT_PAGE_SIZE=20

# Cache Configuration
VITE_CACHE_ENABLED=true
VITE_CACHE_DURATION=300000
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

## Production Build

```bash
# Build for production
npm run build

# Preview the build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── assets/           # Static assets
│   ├── components/       # Reusable components
│   │   ├── common/       # Common UI components
│   │   ├── layout/       # Layout components
│   │   ├── analytics/   # Analytics components
│   │   └── reports/     # Report components
│   ├── configs/         # Configuration files
│   ├── constants/       # App constants
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Page components
│   │   ├── accounts/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── education/
│   │   ├── finance/
│   │   ├── hr/
│   │   ├── inventory/
│   │   ├── procurement/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── tenants/
│   ├── routes/          # Route definitions
│   ├── services/       # API services
│   ├── store/          # Zustand stores
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/              # Public assets
├── index.html           # HTML template
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
└── tailwind.config.js  # Tailwind config
```

## API Endpoints

The frontend communicates with the backend via REST API:

| Module | Endpoint |
|--------|----------|
| Auth | `/api/auth` |
| Accounts | `/api/accounts` |
| Tenants | `/api/tenants` |
| Inventory | `/api/inventory` |
| Finance | `/api/finance` |
| HR | `/api/hr` |
| Reports | `/api/reports` |
| Analytics | `/api/analytics` |
| Education | `/api/education` |
| CRM | `/api/crm` |
| AI | `/api/ai` |
| SCM | `/api/scm` |
| Business | `/api/business` |

## WebSocket Events

Real-time updates via WebSocket:

| Event | Description |
|-------|-------------|
| `dashboard:update` | Dashboard data update |
| `analytics:update` | Analytics data update |
| `notification:new` | New notification |
| `invoice:status` | Invoice status change |

## User Roles & Permissions

| Role | Description |
|------|-------------|
| Super Admin | Full system access |
| Admin | Administrative access |
| Manager | Department management |
| Accountant | Finance operations |
| Sales | Sales activities |
| Purchase | Procurement activities |
| HR | Human resources |
| Teacher | Education |
| Student | Education |
| Warehouse | Warehouse operations |
| Viewer | Read-only access |

## Performance Optimizations

- Code splitting with React.lazy
- Memoization with React.memo
- Virtual scrolling for large lists
- Image lazy loading
- API response caching

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Common Issues

1. **Build fails with TypeScript errors**
   - Run `npm run lint` to see specific errors

2. **API calls failing**
   - Check `.env` file configuration
   - Ensure backend is running on port 8000

3. **WebSocket not connecting**
   - Verify WebSocket URL in `.env`
   - Check browser console for errors

## License

Proprietary - All rights reserved

## Support

For issues and feature requests, please contact the development team.