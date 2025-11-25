import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse'
import { pool } from '../config/database.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import student marks from CO_ATTAINMENT.csv
router.post('/co-attainment', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, '../../', 'CO_ATTAINMENT.csv')
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CO_ATTAINMENT.csv not found in project root' })
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
    const assessmentMap = [
      { name: 'Test-I', startCol: 4, endCol: 8, maxMarksCol: 4 },
      { name: 'Test-II', startCol: 9, endCol: 13, maxMarksCol: 9 },
      { name: 'Mid Term Exam', startCol: 14, endCol: 18, maxMarksCol: 14 },
      { name: 'End Term Exam', startCol: 19, endCol: 23, maxMarksCol: 19 }
    ]

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
        }

        // Process each assessment
        for (const assessment of assessmentMap) {
          const maxMarksValue = maxMarksRow[assessment.maxMarksCol]
          const maxMarks = maxMarksValue ? parseFloat(maxMarksValue) || 100 : 100

          // Get or create assessment
          let assessmentResult = await pool.query(
            'SELECT id FROM assessments WHERE name = $1',
            [assessment.name]
          )

          let assessmentId
          if (assessmentResult.rows.length === 0) {
            const newAssessment = await pool.query(
              'INSERT INTO assessments (name, assessment_type, max_marks) VALUES ($1, $2, $3) RETURNING id',
              [assessment.name, 'Exam', maxMarks]
            )
            assessmentId = newAssessment.rows[0].id
            results.assessmentsCreated++
          } else {
            assessmentId = assessmentResult.rows[0].id
          }

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
            // Insert/update student marks for the assessment
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
      } catch (error) {
        results.errors.push({
          rollNumber,
          error: error.message
        })
        console.error(`Error processing student ${rollNumber}:`, error)
      }
    }

    res.json({
      message: 'CO Attainment CSV import completed successfully',
      ...results
    })
  } catch (error) {
    console.error('Error importing CO Attainment CSV:', error)
    res.status(500).json({ 
      error: 'Failed to import CO Attainment CSV', 
      details: error.message 
    })
  }
})

// Import CO-PO mapping from PO_ATTAINMENT.csv
router.post('/po-attainment', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, '../../', 'PO_ATTAINMENT.csv')
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'PO_ATTAINMENT.csv not found in project root' })
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

    // Process CO-PO mapping rows (rows 9-13, indices 8-12)
    for (let rowIndex = 8; rowIndex <= 12; rowIndex++) {
      const row = records[rowIndex]
      if (!row || row.length === 0) continue

      const coCode = (row[0] || '').trim()
      
      // Skip if not a CO row
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

          // Skip if empty (no correlation)
          if (!correlationValue || correlationValue === '') {
            continue
          }

          // Parse correlation value (should be 1, 2, or 3)
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
      } catch (error) {
        results.errors.push({
          coCode,
          error: error.message
        })
        console.error(`Error processing CO ${coCode}:`, error)
      }
    }

    res.json({
      message: 'PO Attainment CSV import completed successfully',
      ...results
    })
  } catch (error) {
    console.error('Error importing PO Attainment CSV:', error)
    res.status(500).json({ 
      error: 'Failed to import PO Attainment CSV', 
      details: error.message 
    })
  }
})

export default router

