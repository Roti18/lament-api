# Lament API

A secure, high-performance music metadata and streaming API built with Hono, LibSQL (Turso), and ImageKit. Designed for Vercel Serverless deployment.

## Features

- **High Performance**: Built on Hono for minimal latency.
- **Secure**: Strict API Key authentication (Master Key for writes, User Keys for reads) and security hardening.
- **Media Optimization**: Automatic image conversion to WebP and smart storage management with ImageKit.
- **Type Safe**: Full TypeScript implementation with Zod validation.
- **RESTful**: Adheres to strict REST principles with resource-based endpoints.

## Technology Stack

- **Framework**: Hono
- **Runtime**: Node.js 20 (Vercel Serverless)
- **Database**: Turso (LibSQL)
- **Storage**: ImageKit (with Image & Audio support)
- **Validation**: Zod
- **Documentation**: Static HTML/JSON generator

## Project Structure

The project follows a clean MVC architecture within the `src` directory:


```
src/
├── config/         # Database and Environment configuration
├── controllers/    # Request handlers and business logic
├── middlewares/    # Authentication and Security middleware
├── routes/         # Endpoint definitions
├── services/       # External services (ImageKit, Sharp)
├── scripts/        # Database management utilities
├── app.ts          # Application entry point
└── server.ts       # Local development server
```

## Configuration

Copy `.env.example` to `.env` and configure the following variables:

```env
# Server
PORT=3000

# Security
MASTER_KEY=lament-your-secure-key-here

# Database (Turso)
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Storage (ImageKit)
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/...

# Optional: Specific creds for Audio/Image separation
IMAGEKIT_AUDIO_...
IMAGEKIT_IMAGE_...
```

## Development

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
npm install
```

### Running Locally

Start the development server with hot-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.
Documentation is served at the root `/`.

## Database Management

This project includes a built-in CLI for managing the Turso database.

### List All Tables
```bash
npm run db:do list-tables
```

### View Data
```bash
npm run db:do list-rows <table_name>
# Example: npm run db:do list-rows tracks
```

### Run SQL Queries
```bash
npm run db:do query "SELECT * FROM tracks LIMIT 5"
```

### Migrate Schema
Apply changes from `schema.sql` to the database:
```bash
npm run db:push
```

## API Endpoints

Full documentation is available at the root endpoint `/` when running the server.

### Core Resources
- `/tracks`: Manage music tracks
- `/artists`: Manage artist profiles
- `/albums`: Manage albums and collections
- `/categories`: Manage genres
- `/users`: Manage users
- `/api-keys`: Manage access keys

### Storage
- `/upload`: Upload media files (multipart/form-data)

## Deployment

The project is optimized for Vercel.

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy:
   ```bash
   vercel
   ```
3. **Important**: Add your `.env` variables to Vercel Project Settings.

## License

ISC
