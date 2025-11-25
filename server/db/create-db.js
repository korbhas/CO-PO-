import pkg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env file from the server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { Client } = pkg

async function createDatabase() {
  // Connect to postgres database to create the new database
  const adminClient = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Connect to default postgres database
    password: String(process.env.DB_PASSWORD || ''),
    port: parseInt(process.env.DB_PORT || '5432', 10),
  })

  try {
    await adminClient.connect()
    console.log('Connected to PostgreSQL')

    const dbName = process.env.DB_NAME || 'copo_manjim'
    
    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    )

    if (result.rows.length > 0) {
      console.log(`Database "${dbName}" already exists`)
    } else {
      // Create the database
      await adminClient.query(`CREATE DATABASE ${dbName}`)
      console.log(`Database "${dbName}" created successfully`)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error creating database:', error.message)
    process.exit(1)
  } finally {
    await adminClient.end()
  }
}

createDatabase()

