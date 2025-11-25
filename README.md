# Bloom Taxonomy CO-PO Marks System

A full-stack web application for managing Course Outcomes (CO), Program Outcomes (PO) mappings, and student marks with Bloom's Taxonomy breakdown.

## Features

- 📚 **Subject Management**: View and manage multiple subjects (Programming, Graph Theory, Software Engineering)
- 🎯 **CO-PO Mapping**: Visualize correlation between Course Outcomes and Program Outcomes
- 📊 **Student Marks**: View student performance broken down by CO and Bloom Taxonomy levels
- 📥 **CSV Import**: Import student marks and CO-PO mappings from CSV files
- 🔍 **Detailed Analytics**: Track student attainment across different Bloom levels

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Project Structure

```
.
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/      # Page components
│   │   └── components/ # Reusable components
│   └── package.json
├── server/              # Express backend
│   ├── config/         # Database configuration
│   ├── db/             # Database scripts (schema, init, seed)
│   ├── routes/         # API routes
│   └── package.json
├── CO_ATTAINMENT.csv   # Student marks data
├── PO_ATTAINMENT.csv   # CO-PO mapping data
└── package.json        # Root package.json
```

## Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Database Setup

1. **Create PostgreSQL Database**:
   ```bash
   cd server
   npm run create-db
   ```

2. **Create Environment File**:
   Create `server/.env` with the following content:
   ```
   PORT=5000
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=copo_manjim
   DB_PASSWORD=your_password_here
   DB_PORT=5432
   ```

3. **Initialize Database Schema**:
   ```bash
   npm run init-db
   ```

4. **Import Data from CSV Files**:
   ```bash
   npm run seed-csv
   ```

### 3. Run the Application

**Option 1: Run Both Servers Together**
```bash
# From project root
npm run dev
```

**Option 2: Run Separately**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- **Access via backend**: http://localhost:5000 (proxies frontend)

## Available Scripts

### Server Scripts
- `npm run dev` - Start development server with auto-reload
- `npm run start` - Start production server
- `npm run create-db` - Create database if it doesn't exist
- `npm run init-db` - Initialize database schema and seed data
- `npm run seed-csv` - Import data from CSV files

## API Endpoints

- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get subject by ID
- `GET /api/co-po-mapping/matrix` - Get CO-PO mapping matrix
- `GET /api/student-marks` - Get all student marks by CO and Bloom level
- `GET /api/student-marks/by-co` - Get student marks aggregated by CO
- `POST /api/import/co-attainment` - Import CO attainment CSV
- `POST /api/import/po-attainment` - Import PO attainment CSV

## Technologies

- **Frontend**: React, React Router, Vite
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **CSV Parsing**: csv-parse

## Pages

1. **Subject List** (`/subjects`): Lists all available subjects
2. **CO-PO Mapping** (`/subject/:id/mapping`): Displays correlation matrix between COs and POs
3. **Student Marks** (`/subject/:id/results`): Shows student marks broken down by CO and Bloom Taxonomy levels

## License

MIT
