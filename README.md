# Backend Gaza - Community Aid Platform API

A Node.js/Express.js API for a community aid platform that connects people in need with volunteers and resources. The platform facilitates project creation, volunteer coordination, and resource sharing (tools, materials, transport) within communities.

## Project Overview

This backend API powers a community aid platform designed to help organize relief efforts and resource sharing. Users can create projects requesting help, volunteer for existing projects, and offer resources like tools, materials, and transportation services.

### Key Features

- **User Authentication** - Registration, login, profile management
- **Project Management** - Create, manage, and volunteer for aid projects
- **Resource Sharing** - Tools, materials, and transport offerings
- **File Uploads** - Photo support for all resources and profiles
- **Smart Matching** - Priority-based project organization
- **Row-Level Security** - Secure data access with Supabase RLS

## Prerequisites

- **Node.js** v16.0.0 or higher
- **npm** v8.0.0 or higher
- **Supabase Account** (free tier available)
- **Git** for version control

## Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/ibtissem101/Backend-Amel.git
cd Backend-Amel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to Settings > API to get your project URL and keys

### 4. Run Database Migrations

Execute the SQL migration files in order in your Supabase SQL editor:

```
migrations/001_create_users_table.sql
migrations/002_create_projects_table.sql
migrations/003_create_project_volunteers_table.sql
migrations/004_create_outils_table.sql
migrations/005_create_project_outil_requests_table.sql
migrations/006_create_outil_offerings_table.sql
migrations/007_create_materiel_table.sql
migrations/008_create_materiel_offerings_table.sql
migrations/009_create_transport_table.sql
migrations/010_create_transport_offerings_table.sql
migrations/011_create_indexes_and_final_setup.sql
```

### 5. Create Storage Buckets

In Supabase Dashboard > Storage:

1. Create bucket named `photos` (set as public)
2. Create bucket named `user-photos` (set as public)
3. Create bucket named `outil-photos` (set as public)
4. Create bucket named `materiel-photos` (set as public)
5. Create bucket named `transport-photos` (set as public)

### 6. Environment Configuration

```bash
cp .env.example .env
```

Fill in your Supabase credentials in `.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PORT=3001
```

### 7. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "nom": "John Doe",
  "numero": "+1234567890",
  "location": "Gaza City",
  "availableDays": ["monday", "wednesday", "friday"]
}
```

**Response:**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nom": "John Doe",
    "numero": "+1234567890",
    "location": "Gaza City",
    "available_days": ["monday", "wednesday", "friday"]
  },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Project Endpoints

#### Create Project

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": "Gaza City, Block 5",
  "minPersonReq": 5,
  "needsTransportation": true,
  "hasKids": false,
  "hasElderly": true,
  "hasShelter": false,
  "requestedOutilIds": [1, 2, 3]
}
```

#### Get All Projects

```http
GET /api/projects?status=open&location=Gaza
```

#### Get Project Details

```http
GET /api/projects/1
```

#### Update Project

```http
PATCH /api/projects/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": "Updated location",
  "status": "in_progress"
}
```

#### Volunteer for Project

```http
POST /api/projects/1/volunteer
Authorization: Bearer <token>
```

#### Leave Project

```http
DELETE /api/projects/1/volunteer
Authorization: Bearer <token>
```

### Tools (Outils) Endpoints

#### Create Tool

```http
POST /api/outils
Authorization: Bearer <token>
Content-Type: multipart/form-data

nom: "Hammer"
location: "Gaza City"
dureeMax: 24
photo: <file>
```

#### Get All Tools

```http
GET /api/outils?location=Gaza&available=true
```

#### Offer Tool to Project

```http
POST /api/outils/1/offer
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": 1
}
```

### Materials Endpoints

#### Create Material

```http
POST /api/materiel
Authorization: Bearer <token>
Content-Type: multipart/form-data

nom: "Building Blocks"
location: "Gaza City"
photo: <file>
```

#### Get All Materials

```http
GET /api/materiel?search=blocks
```

### Transport Endpoints

#### Create Transport

```http
POST /api/transport
Authorization: Bearer <token>
Content-Type: multipart/form-data

nom: "Pickup Truck"
numero: "+1234567890"
location: "Gaza City"
dureeMax: 48
photo: <file>
```

### User Endpoints

#### Get User Profile

```http
GET /api/users/uuid
```

#### Update Profile

```http
PATCH /api/users/uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "nom": "Updated Name",
  "location": "New Location",
  "availableDays": ["monday", "tuesday"]
}
```

#### Update Profile Photo

```http
POST /api/users/uuid/photo
Authorization: Bearer <token>
Content-Type: multipart/form-data

photo: <file>
```

### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "ok"
}
```

## Database Schema

### Core Tables

- **users** - User profiles and authentication
- **projects** - Community aid projects
- **project_volunteers** - Project-volunteer relationships

### Resource Tables

- **outils** - Tools available for sharing
- **materiel** - Materials available for donation
- **transport** - Transportation services

### Offering Tables

- **outil_offerings** - Tool lending relationships
- **materiel_offerings** - Material donation relationships
- **transport_offerings** - Transport service relationships

### Key Features

- **Generated Columns** - Auto-calculated priority for projects
- **Row Level Security** - User-based access control
- **Cascade Deletes** - Automatic cleanup of related records
- **Indexes** - Optimized queries for performance

## Deployment

### Basic Deployment Steps

1. **Prepare Environment**

   ```bash
   NODE_ENV=production
   ```

2. **Build/Install**

   ```bash
   npm ci --only=production
   ```

3. **Start Server**
   ```bash
   npm start
   ```

### Platform-Specific Guides

#### Heroku

1. Create Heroku app: `heroku create your-app-name`
2. Set environment variables: `heroku config:set SUPABASE_URL=...`
3. Deploy: `git push heroku main`

#### Railway

1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

#### DigitalOcean App Platform

1. Create new app from GitHub
2. Configure environment variables
3. Deploy

## Troubleshooting

### Common Issues

#### 1. "Missing environment variables"

**Problem:** `SUPABASE_URL environment variable is required`
**Solution:** Ensure `.env` file exists and contains all required variables

#### 2. "Authentication failed"

**Problem:** `Invalid or expired token`
**Solutions:**

- Check if JWT token is properly included in Authorization header
- Verify token hasn't expired - login again if needed
- Ensure token format: `Bearer <token>`

#### 3. "Failed to fetch user"

**Problem:** Database connection errors
**Solutions:**

- Verify Supabase project is active
- Check SUPABASE_URL and keys are correct
- Ensure database migrations have been run

#### 4. "Photo upload failed"

**Problem:** File upload errors
**Solutions:**

- Verify storage buckets exist in Supabase
- Check bucket permissions (should be public)
- Ensure file size is under 5MB
- Verify file type is image (JPEG, PNG, WEBP)

#### 5. "CORS errors"

**Problem:** Cross-origin request blocked
**Solution:** CORS is already configured for all origins in development

#### 6. "Project creation failed"

**Problem:** Validation or permission errors
**Solutions:**

- Check all required fields are provided
- Verify user is authenticated
- Ensure location and minPersonReq are valid

#### 7. "Port already in use"

**Problem:** `Error: listen EADDRINUSE :::3001`
**Solutions:**

- Change PORT in `.env` file
- Kill process using port: `npx kill-port 3001`
- Use different port: `PORT=3002 npm run dev`

### Debug Mode

Set `NODE_ENV=development` for detailed error logs and stack traces.

### Getting Help

- Check server logs for detailed error messages
- Verify Supabase dashboard for database issues
- Ensure all migrations have been applied
- Check network connectivity to Supabase

## License

This project is licensed under the MIT License.
