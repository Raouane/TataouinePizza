# Tataouine Pizza - Online Ordering Platform

## Overview

Tataouine Pizza is a full-stack pizza ordering web application designed for a pizzeria in Tataouine, Tunisia. The platform enables customers to browse the menu, add items to cart, place orders with OTP phone verification, and track their delivery in real-time. It includes separate admin and driver dashboards for order management and delivery coordination.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: React Context API for cart, order tracking, and internationalization
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom warm desert theme (sand/terracotta colors)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful JSON API with `/api` prefix
- **Authentication**: 
  - Admin: JWT-based authentication with bcrypt password hashing
  - Customers/Drivers: OTP-based phone verification
- **Error Handling**: Centralized error handler with custom AppError class

### Database Layer
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Database**: PostgreSQL via Neon serverless driver
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command

### Key Data Models
- **Admin Users**: Email/password authentication for dashboard access
- **Drivers**: Phone-based authentication, delivery status tracking
- **Pizzas**: Menu items with multiple size-based pricing
- **Orders**: Customer orders with status progression and driver assignment
- **OTP Codes**: Time-limited verification codes for phone authentication

### Internationalization
- Three languages supported: French (default), English, Arabic
- RTL layout support for Arabic
- Translation keys stored in `client/src/lib/i18n.tsx`

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route-based page components
│   │   ├── lib/          # Utilities, contexts, API client
│   │   └── hooks/        # Custom React hooks
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   ├── auth.ts       # Authentication utilities
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema and Zod validators
└── migrations/       # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Neon**: Serverless PostgreSQL driver (`@neondatabase/serverless`)

### Authentication
- **JWT**: Token-based admin authentication (requires `JWT_SECRET` environment variable)
- **bcryptjs**: Password hashing for admin accounts

### Frontend Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms)
- **Framer Motion**: Animation library
- **canvas-confetti**: Order success celebration effect
- **date-fns**: Date formatting utilities

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **esbuild**: Server-side bundling for production
- **Vite**: Development server and client bundling

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing (defaults to dev key if not set)