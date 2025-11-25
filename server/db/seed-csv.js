import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse'
import { pool } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import student marks from CO_ATTAINMENT.csv
async function importCOAttainment() {
  try {
    console.log('\n📊 Starting CO Attainment CSV import...')
    const csvPath = path.join(__dirname, '../../', 'CO_ATTAINMENT.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('CO_ATTAINMENT.csv not found in project root')
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const records = await new Promise((resolve, reject) => {
      parse(fileContent, {
        skip_empty_lines: false,
        relax_column_count: true,
        trim: true
      }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })

    const maxMarksRow = records[9] || [] // Row 10: CO WISE MAXIMUM MARKS
    const results = {
      studentsProcessed: 0,
      marksInserted: 0,
      assessmentsCreated: 0,
      errors: []
    }

    // Map assessments: Test-I (cols 4-8), Test-II (cols 9-13), Mid Term (cols 14-18), End Term (cols 19-23)
    // Each assessment has 5 CO columns (CO1-CO5)
    const assessmentMap = [
      { name: 'Test-I', startCol: 4, endCol: 8, maxMarksCol: 4, coStartIndex: 0 },
      { name: 'Test-II', startCol: 9, endCol: 13, maxMarksCol: 9, coStartIndex: 0 },
      { name: 'Mid Term Exam', startCol: 14, endCol: 18, maxMarksCol: 14, coStartIndex: 0 },
      { name: 'End Term Exam', startCol: 19, endCol: 23, maxMarksCol: 19, coStartIndex: 0 }
    ]
    
    // CO codes in order (CO1, CO2, CO3, CO4, CO5)
    const coCodes = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5']
    
    // Get Bloom level IDs - we'll use "Apply" as default since CSV doesn't specify Bloom levels
    const bloomResult = await pool.query(
      "SELECT id FROM bloom_levels WHERE name = 'Apply' LIMIT 1"
    )
    const defaultBloomLevelId = bloomResult.rows[0]?.id || 3 // Fallback to ID 3 if not found

    // First, ensure all assessments exist and have proper mappings
    // This needs to happen before processing students
    const assessmentIds = {}
    for (const assessment of assessmentMap) {
      // Calculate total max marks for this assessment
      let totalMaxMarks = 0
      for (let i = 0; i < coCodes.length; i++) {
        const colIndex = assessment.startCol + i
        const coMaxMarks = maxMarksRow[colIndex]
        if (coMaxMarks) {
          totalMaxMarks += parseFloat(coMaxMarks) || 0
        }
      }

      // Get or create assessment
      let assessmentResult = await pool.query(
        'SELECT id FROM assessments WHERE name = $1',
        [assessment.name]
      )

      let assessmentId
      if (assessmentResult.rows.length === 0) {
        const newAssessment = await pool.query(
          'INSERT INTO assessments (name, assessment_type, max_marks) VALUES ($1, $2, $3) RETURNING id',
          [assessment.name, 'Exam', totalMaxMarks || 100]
        )
        assessmentId = newAssessment.rows[0].id
        results.assessmentsCreated++
      } else {
        assessmentId = assessmentResult.rows[0].id
      }
      
      assessmentIds[assessment.name] = assessmentId
      
      // Create/update assessment_co_mapping entries for this assessment
      for (let i = 0; i < coCodes.length; i++) {
        const colIndex = assessment.startCol + i
        const coMaxMarksValue = maxMarksRow[colIndex]
        const coMaxMarks = coMaxMarksValue ? parseFloat(coMaxMarksValue) : 0
        
        if (coMaxMarks > 0) {
          // Get CO ID
          const coResult = await pool.query(
            'SELECT id FROM course_outcomes WHERE code = $1',
            [coCodes[i]]
          )
          
          if (coResult.rows.length > 0) {
            const coId = coResult.rows[0].id
            
            // Create or update mapping entry
            await pool.query(
              `INSERT INTO assessment_co_mapping (assessment_id, co_id, bloom_level_id, max_marks, weight)
               VALUES ($1, $2, $3, $4, 1.0)
               ON CONFLICT (assessment_id, co_id, bloom_level_id) 
               DO UPDATE SET max_marks = $4`,
              [assessmentId, coId, defaultBloomLevelId, coMaxMarks]
            )
          }
        }
      }
    }

    // Process student rows starting from row 11 (index 10)
    for (let rowIndex = 10; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex]
      if (!row || row.length < 3) continue

      const rollNumber = (row[1] || '').trim()
      const studentName = (row[2] || '').trim()

      if (!rollNumber || rollNumber === 'Roll No.' || rollNumber.includes('CO WISE') || rollNumber === '') {
        continue
      }

      try {
        // Get or create student
        let studentResult = await pool.query(
          'SELECT id FROM students WHERE roll_number = $1',
          [rollNumber]
        )

        let studentId
        if (studentResult.rows.length === 0) {
          const newStudent = await pool.query(
            'INSERT INTO students (roll_number, name) VALUES ($1, $2) RETURNING id',
            [rollNumber, studentName || rollNumber]
          )
          studentId = newStudent.rows[0].id
        } else {
          studentId = studentResult.rows[0].id
          await pool.query(
            'UPDATE students SET name = $1 WHERE id = $2',
            [studentName || rollNumber, studentId]
          )
        }

        // Process each assessment
        for (const assessment of assessmentMap) {
          const assessmentId = assessmentIds[assessment.name]

          // Calculate total marks for this assessment (sum of all COs)
          let totalMarks = 0
          
          for (let col = assessment.startCol; col <= assessment.endCol; col++) {
            const marksValue = (row[col] || '').trim()

            if (marksValue && marksValue !== 'AB' && marksValue !== 'UR' && marksValue !== '') {
              const marks = parseFloat(marksValue)
              if (!isNaN(marks)) {
                totalMarks += marks
              }
            }
          }

          if (totalMarks > 0) {
            await pool.query(
              `INSERT INTO student_marks (student_id, assessment_id, marks_obtained) 
               VALUES ($1, $2, $3) 
               ON CONFLICT (student_id, assessment_id) 
               DO UPDATE SET marks_obtained = $3, updated_at = CURRENT_TIMESTAMP`,
              [studentId, assessmentId, totalMarks]
            )
            results.marksInserted++
          }
        }

        results.studentsProcessed++
        if (results.studentsProcessed % 10 === 0) {
          process.stdout.write(`\rProcessed ${results.studentsProcessed} students...`)
        }
      } catch (error) {
        results.errors.push({
          rollNumber,
          error: error.message
        })
        console.error(`\nError processing student ${rollNumber}:`, error.message)
      }
    }

    console.log('\n✅ CO Attainment import completed!')
    console.log(`   - Students processed: ${results.studentsProcessed}`)
    console.log(`   - Assessments created: ${results.assessmentsCreated}`)
    console.log(`   - Marks inserted/updated: ${results.marksInserted}`)
    if (results.errors.length > 0) {
      console.log(`   - Errors: ${results.errors.length}`)
      results.errors.slice(0, 5).forEach(err => {
        console.log(`     - ${err.rollNumber}: ${err.error}`)
      })
    }
    
    return results
  } catch (error) {
    console.error('❌ Error importing CO Attainment CSV:', error)
    throw error
  }
}

// Import CO-PO mapping from PO_ATTAINMENT.csv
async function importPOAttainment() {
  try {
    console.log('\n📊 Starting PO Attainment CSV import...')
    const csvPath = path.join(__dirname, '../../', 'PO_ATTAINMENT.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('PO_ATTAINMENT.csv not found in project root')
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const records = await new Promise((resolve, reject) => {
      parse(fileContent, {
        skip_empty_lines: false,
        relax_column_count: true,
        trim: true
      }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })

    const results = {
      cosProcessed: 0,
      mappingsInserted: 0,
      posCreated: 0,
      errors: []
    }

    // Row 8 (index 7): PO headers - PO1, PO2, ..., PO12, PSO1, PSO2, PSO3
    const poHeadersRow = records[7] || []
    
    // Extract PO codes from headers (columns 1-17, skipping first empty column)
    const poCodes = []
    for (let i = 1; i < poHeadersRow.length; i++) {
      const poCode = (poHeadersRow[i] || '').trim()
      if (poCode && (poCode.startsWith('PO') || poCode.startsWith('PSO'))) {
        poCodes.push({ code: poCode, colIndex: i })
      }
    }

    console.log(`Found ${poCodes.length} Program Outcomes to process`)

    // Process CO-PO mapping rows (rows 9-13, indices 8-12)
    for (let rowIndex = 8; rowIndex <= 12; rowIndex++) {
      const row = records[rowIndex]
      if (!row || row.length === 0) continue

      const coCode = (row[0] || '').trim()
      
      if (!coCode || !coCode.startsWith('CO')) {
        continue
      }

      try {
        // Get or create Course Outcome
        let coResult = await pool.query(
          'SELECT id FROM course_outcomes WHERE code = $1',
          [coCode]
        )

        let coId
        if (coResult.rows.length === 0) {
          const newCO = await pool.query(
            'INSERT INTO course_outcomes (code, description) VALUES ($1, $2) RETURNING id',
            [coCode, `${coCode} - Course Outcome`]
          )
          coId = newCO.rows[0].id
        } else {
          coId = coResult.rows[0].id
        }

        // Process each PO mapping
        for (const poInfo of poCodes) {
          const correlationValue = (row[poInfo.colIndex] || '').trim()

          if (!correlationValue || correlationValue === '') {
            continue
          }

          const correlation = parseInt(correlationValue)
          if (isNaN(correlation) || correlation < 1 || correlation > 3) {
            continue
          }

          // Get or create Program Outcome
          let poResult = await pool.query(
            'SELECT id FROM program_outcomes WHERE code = $1',
            [poInfo.code]
          )

          let poId
          if (poResult.rows.length === 0) {
            const newPO = await pool.query(
              'INSERT INTO program_outcomes (code, description) VALUES ($1, $2) RETURNING id',
              [poInfo.code, `${poInfo.code} - Program Outcome`]
            )
            poId = newPO.rows[0].id
            results.posCreated++
          } else {
            poId = poResult.rows[0].id
          }

          // Insert or update CO-PO mapping
          await pool.query(
            `INSERT INTO co_po_mapping (co_id, po_id, correlation_value) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (co_id, po_id) 
             DO UPDATE SET correlation_value = $3`,
            [coId, poId, correlation]
          )
          results.mappingsInserted++
        }

        results.cosProcessed++
        console.log(`   ✓ Processed ${coCode}`)
      } catch (error) {
        results.errors.push({
          coCode,
          error: error.message
        })
        console.error(`   ✗ Error processing CO ${coCode}:`, error.message)
      }
    }

    console.log('\n✅ PO Attainment import completed!')
    console.log(`   - COs processed: ${results.cosProcessed}`)
    console.log(`   - POs created: ${results.posCreated}`)
    console.log(`   - Mappings inserted/updated: ${results.mappingsInserted}`)
    if (results.errors.length > 0) {
      console.log(`   - Errors: ${results.errors.length}`)
      results.errors.forEach(err => {
        console.log(`     - ${err.coCode}: ${err.error}`)
      })
    }
    
    return results
  } catch (error) {
    console.error('❌ Error importing PO Attainment CSV:', error)
    throw error
  }
}

// Main seed function
async function seedFromCSV() {
  try {
    console.log('🌱 Starting CSV data import...')
    console.log('='.repeat(50))

    // Import PO Attainment first (creates COs and mappings)
    await importPOAttainment()

    // Import CO Attainment (creates students and marks)
    await importCOAttainment()

    console.log('\n' + '='.repeat(50))
    console.log('✅ All CSV data imported successfully!')
    console.log('\nYou can now:')
    console.log('   - View subjects at http://localhost:5000/subjects')
    console.log('   - View CO-PO mappings')
    console.log('   - View student marks and results')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Failed to import CSV data:', error.message)
    process.exit(1)
  }
}

// Run the seed function
seedFromCSV()

