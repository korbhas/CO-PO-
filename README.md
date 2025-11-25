# React + PostgreSQL Project

A full-stack application with React frontend and Node.js/Express backend connected to PostgreSQL.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm run install:all
```

Or install separately:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE copo_manjim;
```

2. Copy the environment example file:
```bash
cp server/.env.example server/.env
```

3. Update `server/.env` with your PostgreSQL credentials:
```
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=copo_manjim
DB_PASSWORD=your_password_here
DB_PORT=5432
```

### 3. Run the Application

Start both frontend and backend:
```bash
npm run dev
```

Or run separately:
```bash
# Frontend (runs on http://localhost:3000)
npm run dev:client

# Backend (runs on http://localhost:5000)
npm run dev:server
```

## Project Structure

```
.
├── client/          # React frontend
│   ├── src/
│   └── package.json
├── server/          # Express backend
│   ├── config/
│   ├── index.js
│   └── package.json
└── package.json     # Root package.json
```

## Technologies

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Package Manager**: npm

