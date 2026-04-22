# Elites E-Commerce Frontend

Welcome to the **Elites** frontend repository. This is a modern, responsive, and production-ready e-commerce single-page application (SPA). Designed with a vibrant, ALX-inspired color palette (Spring Green & Blue Zodiac), Elites provides a seamless end-to-end shopping experience—from product discovery to checkout.

The project is architected to be connected to a robust Django/PostgreSQL backend infrastructure hosted on AWS.

## ✨ Key Features

- **Seamless Shopping Journey**: Fully interactive product catalogs, detail pages, and a persistent slide-out cart.
- **Production-Ready Checkout**: Multi-step checkout form with user-friendly validation, supporting local payment methods (M-Pesa, Cash on Delivery, Card).
- **Order Success Flow**: Dedicated, polished success confirmations providing direct feedback and reference IDs immediately after purchase.
- **Mobile-First Responsive Design**: Beautiful UI powered by Tailwind CSS. Every grid, drawer, and action button dynamically stacks and scales for a flawless experience on smartphones and tablets.
- **Secure Authentication UI**: Pre-built Login, Registration, and Account Profile screens. Includes logic for `X-CSRFToken` handling, fully prepared for Django session cookies.
- **Microservice-Ready Architecture**: Circuit breaker pattern, correlation ID tracking, automatic retry logic, and token refresh interceptors for resilient distributed systems.
- **Product Reviews**: Full review system with rating submission and display functionality.
- **Comprehensive Error Handling**: Dedicated error boundary components and user-friendly error pages.

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Lucide Icons for clean, utility-first UI
- **State Management**: Zustand (UI state) + React Query (Server state)
- **Routing**: React Router v6
- **Mock Integration**: MSW (Mock Service Worker) for frontend-first isolated development
- **Testing**: Vitest + React Testing Library + Fast-check (property-based testing)
- **Resilience Patterns**: Circuit breaker, automatic retries, correlation ID tracking
- **Containerization**: Docker with optimized multi-stage builds and Nginx

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation & Execution

```bash

# Install dependencies
npm install

# Start the Vite development server (runs with MSW mocks enabled)
npm run dev
```

### Environment Configuration

The application is configured via Vite environment files (`.env.development`, `.env.production`).  
Copy `.env.production.example` to `.env.production` and fill in the required values before deploying.

#### Environment Variables

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | `string` | `""` (dev) / **required** (prod) | Full base URL of the API Gateway invoke URL. Empty string in development so the Vite dev-server proxy handles routing. Must be set to the AWS API Gateway stage URL in production. |
| `VITE_ENABLE_MOCKS` | `"true" \| "false"` | `"false"` | When `"true"`, activates MSW (Mock Service Worker) in the browser so the UI runs without a live backend. Set to `"false"` in all production deployments. |
| `VITE_APP_VERSION` | `string` | `""` | Human-readable version string (e.g. git SHA or semver tag) injected by the CI/CD pipeline. Used for diagnostics and release tracking. |

**Development** (`.env.development`):

```env
VITE_API_BASE_URL=""
VITE_ENABLE_MOCKS=false
```

**Production** (`.env.production` — see `.env.production.example`):

```env
VITE_API_BASE_URL=https://abc123xyz.execute-api.eu-west-1.amazonaws.com/prod
VITE_ENABLE_MOCKS=false
VITE_APP_VERSION=a1b2c3d4
```

## 📦 Project Structure

```text
src/
├── api/          # Network layer (Axios config, Interceptors, Django CSRF handling)
│   ├── interceptors/  # Token refresh, retry logic, correlation ID tracking
│   ├── circuitBreaker.ts  # Circuit breaker pattern for resilient API calls
│   └── *.api.ts  # API modules (auth, cart, orders, products, reviews)
├── components/   # Modular, reusable UI chunks (Products, Cart, Form Inputs, Auth)
│   ├── errors/   # Error boundary and error display components
│   └── products/ # Product cards, grids, reviews
├── hooks/        # Custom React Query & utility hooks
├── mocks/        # MSW offline data simulating the future PostgreSQL structure
├── pages/        # Top-level route components (Home, Checkout, Success, Orders)
├── store/        # Zustand global states (Cart open/close, Auth tokens)
│   └── __tests__/  # Store unit tests
├── types/        # TypeScript interfaces defining global domains (User, Product, Order)
└── utils/        # Price formatting and parsing utilities
```

## 🏗️ Building for Production

This application adheres to strict TypeScript checking and ESLint rules to guarantee stability.

```bash
# Validate types and generate production bundle
npm run build

# Preview the minified production output
npm run preview

# Run tests
npm run test
```

### Docker Deployment

The application includes a production-ready Dockerfile with multi-stage builds:

```bash
# Build the Docker image
docker build -t elites-frontend .

# Run the container
docker run -p 80:80 elites-frontend
```

The Docker image uses Nginx to serve the static assets with optimized caching and compression.

## 🤝 Next Steps for Backend Integration

This frontend was explicitly prepared to be plugged into a Django REST Framework API.
The Axios client in `src/api/client.ts` is pre-configured with `withCredentials: true` to seamlessly accept backend HttpOnly cookies and attach necessary CSRF validation headers for secure mutation requests.

## 📄 License

© 2026 Elites Marketplace. All rights reserved.
