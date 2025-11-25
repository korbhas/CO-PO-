import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initializeDatabase() {
  try {
    console.log('Initializing database...')
    
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    await pool.query(schema)
    console.log('Schema created successfully')
    
    await seedBloomLevels()
    await seedProgramOutcomes()
    await seedSampleData()
    
    console.log('Database initialization completed!')
    process.exit(0)
  } catch (error) {
    console.error('Error initializing database:', error)
    process.exit(1)
  }
}

async function seedBloomLevels() {
  const bloomLevels = [
    { name: 'Remember', level_order: 1, description: 'Recall facts and basic concepts' },
    { name: 'Understand', level_order: 2, description: 'Explain ideas or concepts' },
    { name: 'Apply', level_order: 3, description: 'Use information in new situations' },
    { name: 'Analyze', level_order: 4, description: 'Draw connections among ideas' },
    { name: 'Evaluate', level_order: 5, description: 'Justify a stand or decision' },
    { name: 'Create', level_order: 6, description: 'Produce new or original work' }
  ]
  
  for (const level of bloomLevels) {
    await pool.query(
      'INSERT INTO bloom_levels (name, level_order, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
      [level.name, level.level_order, level.description]
    )
  }
  console.log('Bloom levels seeded')
}

async function seedProgramOutcomes() {
  const programOutcomes = [
    { code: 'PO1', description: 'Engineering knowledge' },
    { code: 'PO2', description: 'Problem analysis' },
    { code: 'PO3', description: 'Design/development of solutions' },
    { code: 'PO4', description: 'Conduct investigations of complex problems' },
    { code: 'PO5', description: 'Modern tool usage' },
    { code: 'PO6', description: 'The engineer and society' },
    { code: 'PO7', description: 'Environment and sustainability' },
    { code: 'PO8', description: 'Ethics' },
    { code: 'PO9', description: 'Individual and team work' },
    { code: 'PO10', description: 'Communication' },
    { code: 'PO11', description: 'Project management and finance' },
    { code: 'PO12', description: 'Life-long learning' }
  ]
  
  for (const po of programOutcomes) {
    await pool.query(
      'INSERT INTO program_outcomes (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
      [po.code, po.description]
    )
  }
  console.log('Program outcomes seeded')
}

async function seedSampleData() {
  const courseOutcomes = [
    { code: 'CO1', description: 'Course Outcome 1' },
    { code: 'CO2', description: 'Course Outcome 2' },
    { code: 'CO3', description: 'Course Outcome 3' },
    { code: 'CO4', description: 'Course Outcome 4' },
    { code: 'CO5', description: 'Course Outcome 5' },
    { code: 'CO6', description: 'Course Outcome 6' }
  ]
  
  for (const co of courseOutcomes) {
    await pool.query(
      'INSERT INTO course_outcomes (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
      [co.code, co.description]
    )
  }
  
  const students = [
    { roll_number: 'STU001', name: 'John Doe', email: 'john@example.com' },
    { roll_number: 'STU002', name: 'Jane Smith', email: 'jane@example.com' },
    { roll_number: 'STU003', name: 'Bob Johnson', email: 'bob@example.com' }
  ]
  
  for (const student of students) {
    await pool.query(
      'INSERT INTO students (roll_number, name, email) VALUES ($1, $2, $3) ON CONFLICT (roll_number) DO NOTHING',
      [student.roll_number, student.name, student.email]
    )
  }
  
  const assessments = [
    { name: 'Midterm Exam', assessment_type: 'Exam', date: '2024-01-15', max_marks: 100 },
    { name: 'Final Exam', assessment_type: 'Exam', date: '2024-02-20', max_marks: 100 },
    { name: 'Assignment 1', assessment_type: 'Assignment', date: '2024-01-10', max_marks: 50 }
  ]
  
  for (const assessment of assessments) {
    await pool.query(
      'INSERT INTO assessments (name, assessment_type, date, max_marks) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [assessment.name, assessment.assessment_type, assessment.date, assessment.max_marks]
    )
  }
  
  console.log('Sample data seeded')
}

initializeDatabase()

