# CrewAI Dashboard Project

## Overview

This project is a real-time dashboard for monitoring and interacting with AI agents in a CrewAI system. It features a React frontend and Express.js backend with WebSocket support for real-time agent output streaming. The application allows users to submit tasks to agents, monitor agent status, and view agent outputs in real-time.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React and uses a component-based architecture with:

- **React** as the UI library
- **Shadcn UI** for styled components (based on Radix UI)
- **React Query** for data fetching and state management
- **WebSockets** for real-time updates from agents
- **Tailwind CSS** for styling with a customized theme

The frontend is organized into pages, components, hooks, and utility functions. Components are modular and reusable, with UI components separated from business logic.

### Backend

The backend is built with:

- **Express.js** for HTTP handling
- **WebSockets** for real-time communication
- **Drizzle ORM** for database operations
- **Zod** for schema validation

The backend serves both the API endpoints and the static frontend assets in production. In development, it uses Vite's dev server.

### Data Storage

The application uses:

- **PostgreSQL** database (to be connected via Drizzle ORM)
- **Drizzle ORM** for database schema management and queries
- **Database schemas** for users, agents, agent outputs, and tasks

### Real-time Communication

The application uses WebSockets to:
- Stream agent outputs in real-time
- Update agent status changes
- Provide immediate feedback for user actions

## Key Components

### Frontend Components

1. **Dashboard** - Main container for the application
2. **AgentListItem** - Displays an individual agent with its status
3. **StreamContainer** - Shows real-time outputs from agents
4. **TaskInput** - Allows users to submit tasks to agents
5. **AgentMetrics** - Shows performance metrics for agents
6. **AgentOutput** - Displays formatted agent responses

### Backend Services

1. **Express Routes** - Handle HTTP API requests
2. **WebSocket Server** - Manages real-time communication
3. **Storage Service** - Handles database operations
4. **CrewService** - Manages agent creation and task execution

### Database Schema

The database includes tables for:
1. **Users** - Authentication and user management
2. **Agents** - Store agent information including name, role, status
3. **Agent Outputs** - Store agent responses and task results
4. **Tasks** - Store user-submitted tasks

## Data Flow

1. **Task Submission**:
   - User submits a task via the UI
   - Request is sent to the server
   - Server validates and stores the task
   - Server assigns the task to appropriate agents
   - WebSocket messages notify the UI of status changes

2. **Real-time Updates**:
   - Agents process tasks and produce outputs
   - Outputs are stored in the database
   - WebSocket messages push updates to connected clients
   - UI updates to show new outputs and status changes

3. **Agent Status Monitoring**:
   - Backend tracks agent status (idle, working, completed)
   - Status changes are broadcast via WebSockets
   - UI updates to reflect current agent status

## External Dependencies

### Frontend Dependencies
- React and React DOM
- TanStack React Query for data fetching
- Radix UI components for UI elements
- Tailwind CSS for styling
- Wouter for routing
- React Hook Form for form handling

### Backend Dependencies
- Express.js for HTTP server
- ws for WebSocket support
- Drizzle ORM for database operations
- Zod for schema validation
- nanoid for generating unique IDs

## Deployment Strategy

The application is configured for deployment on Replit with:

1. **Build Process**:
   - Frontend: Built with Vite
   - Backend: Bundled with esbuild
   - Combined into a single deployable unit

2. **Environment Variables**:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NODE_ENV` - Environment mode (development/production)

3. **Replit Configuration**:
   - Uses Node.js 20 runtime
   - Includes PostgreSQL 16 module
   - Automatic deployment via Replit's deployment system

4. **Start Commands**:
   - Development: `npm run dev`
   - Production: `npm run start`

## Development Workflow

1. **Local Development**:
   - Run `npm run dev` to start the development server
   - Frontend and backend hot reload for quick iteration

2. **Database Schema Changes**:
   - Edit schema in `shared/schema.ts`
   - Run `npm run db:push` to apply changes to the database

3. **Building for Production**:
   - Run `npm run build` to create production assets
   - The build process bundles both frontend and backend

## Getting Started

1. Ensure PostgreSQL is provisioned by adding a `DATABASE_URL` in the Replit Secrets
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. Access the application at the provided URL