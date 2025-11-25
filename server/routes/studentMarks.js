import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id as student_id,
        s.roll_number,
        s.name as student_name,
        co.code as co_code,
        bl.name as bloom_level,
        bl.level_order,
        COALESCE(SUM(
          CASE 
            WHEN sm.marks_obtained IS NOT NULL AND a.max_marks > 0 AND acm.max_marks > 0 THEN 
              (sm.marks_obtained / a.max_marks) * acm.max_marks * acm.weight
            ELSE 0
          END
        ), 0) as marks_obtained
      FROM students s
      CROSS JOIN course_outcomes co
      CROSS JOIN bloom_levels bl
      LEFT JOIN assessment_co_mapping acm ON acm.co_id = co.id AND acm.bloom_level_id = bl.id
      LEFT JOIN assessments a ON acm.assessment_id = a.id
      LEFT JOIN student_marks sm ON sm.student_id = s.id AND sm.assessment_id = a.id
      GROUP BY s.id, s.roll_number, s.name, co.code, bl.name, bl.level_order
      ORDER BY s.roll_number, co.code, bl.level_order
    `
    const result = await pool.query(query)
    
    const marksByStudent = {}
    result.rows.forEach(row => {
      if (!marksByStudent[row.student_id]) {
        marksByStudent[row.student_id] = {
          student_id: row.student_id,
          roll_number: row.roll_number,
          student_name: row.student_name,
          marks: {}
        }
      }
      if (!marksByStudent[row.student_id].marks[row.co_code]) {
        marksByStudent[row.student_id].marks[row.co_code] = {}
      }
      marksByStudent[row.student_id].marks[row.co_code][row.bloom_level] = parseFloat(row.marks_obtained) || 0
    })
    
    res.json(Object.values(marksByStudent))
  } catch (error) {
    console.error('Error fetching student marks:', error)
    res.status(500).json({ error: 'Failed to fetch student marks' })
  }
})

router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params
    const query = `
      SELECT 
        co.code as co_code,
        bl.name as bloom_level,
        bl.level_order,
        COALESCE(SUM(
          CASE 
            WHEN sm.marks_obtained IS NOT NULL AND a.max_marks > 0 AND acm.max_marks > 0 THEN 
              (sm.marks_obtained / a.max_marks) * acm.max_marks * acm.weight
            ELSE 0
          END
        ), 0) as marks_obtained
      FROM course_outcomes co
      CROSS JOIN bloom_levels bl
      LEFT JOIN assessment_co_mapping acm ON acm.co_id = co.id AND acm.bloom_level_id = bl.id
      LEFT JOIN assessments a ON acm.assessment_id = a.id
      LEFT JOIN student_marks sm ON sm.student_id = $1 AND sm.assessment_id = a.id
      GROUP BY co.code, bl.name, bl.level_order
      ORDER BY co.code, bl.level_order
    `
    const result = await pool.query(query, [studentId])
    
    const marksByCO = {}
    result.rows.forEach(row => {
      if (!marksByCO[row.co_code]) {
        marksByCO[row.co_code] = {}
      }
      marksByCO[row.co_code][row.bloom_level] = parseFloat(row.marks_obtained) || 0
    })
    
    res.json(marksByCO)
  } catch (error) {
    console.error('Error fetching student marks:', error)
    res.status(500).json({ error: 'Failed to fetch student marks' })
  }
})

router.get('/by-co', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id as student_id,
        s.roll_number,
        s.name as student_name,
        co.id as co_id,
        co.code as co_code,
        co.description as co_description,
        COALESCE(SUM(
          CASE 
            WHEN sm.marks_obtained IS NOT NULL AND a.max_marks > 0 AND acm.max_marks > 0 THEN 
              (sm.marks_obtained / a.max_marks) * acm.max_marks * acm.weight
            ELSE 0
          END
        ), 0) as total_marks,
        COALESCE(SUM(acm.max_marks * acm.weight), 0) as max_marks
      FROM students s
      CROSS JOIN course_outcomes co
      LEFT JOIN assessment_co_mapping acm ON acm.co_id = co.id
      LEFT JOIN assessments a ON acm.assessment_id = a.id
      LEFT JOIN student_marks sm ON sm.student_id = s.id AND sm.assessment_id = a.id
      GROUP BY s.id, s.roll_number, s.name, co.id, co.code, co.description
      ORDER BY s.roll_number, co.code
    `
    const result = await pool.query(query)
    
    const marksByStudent = {}
    result.rows.forEach(row => {
      if (!marksByStudent[row.student_id]) {
        marksByStudent[row.student_id] = {
          student_id: row.student_id,
          roll_number: row.roll_number,
          student_name: row.student_name,
          co_marks: {}
        }
      }
      marksByStudent[row.student_id].co_marks[row.co_code] = {
        co_id: row.co_id,
        co_code: row.co_code,
        co_description: row.co_description,
        marks_obtained: parseFloat(row.total_marks) || 0,
        max_marks: parseFloat(row.max_marks) || 0,
        percentage: row.max_marks > 0 
          ? ((parseFloat(row.total_marks) || 0) / parseFloat(row.max_marks) * 100).toFixed(2)
          : 0
      }
    })
    
    res.json(Object.values(marksByStudent))
  } catch (error) {
    console.error('Error fetching student marks by CO:', error)
    res.status(500).json({ error: 'Failed to fetch student marks by CO' })
  }
})

router.get('/by-co/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params
    const query = `
      SELECT 
        co.id as co_id,
        co.code as co_code,
        co.description as co_description,
        COALESCE(SUM(
          CASE 
            WHEN sm.marks_obtained IS NOT NULL AND a.max_marks > 0 AND acm.max_marks > 0 THEN 
              (sm.marks_obtained / a.max_marks) * acm.max_marks * acm.weight
            ELSE 0
          END
        ), 0) as total_marks,
        COALESCE(SUM(acm.max_marks * acm.weight), 0) as max_marks
      FROM course_outcomes co
      LEFT JOIN assessment_co_mapping acm ON acm.co_id = co.id
      LEFT JOIN assessments a ON acm.assessment_id = a.id
      LEFT JOIN student_marks sm ON sm.student_id = $1 AND sm.assessment_id = a.id
      GROUP BY co.id, co.code, co.description
      ORDER BY co.code
    `
    const result = await pool.query(query, [studentId])
    
    const coMarks = {}
    result.rows.forEach(row => {
      const maxMarks = parseFloat(row.max_marks) || 0
      const marksObtained = parseFloat(row.total_marks) || 0
      coMarks[row.co_code] = {
        co_id: row.co_id,
        co_code: row.co_code,
        co_description: row.co_description,
        marks_obtained: marksObtained,
        max_marks: maxMarks,
        percentage: maxMarks > 0 ? ((marksObtained / maxMarks) * 100).toFixed(2) : 0
      }
    })
    
    res.json(coMarks)
  } catch (error) {
    console.error('Error fetching student marks by CO:', error)
    res.status(500).json({ error: 'Failed to fetch student marks by CO' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { student_id, assessment_id, marks_obtained } = req.body
    const result = await pool.query(
      `INSERT INTO student_marks (student_id, assessment_id, marks_obtained) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (student_id, assessment_id) 
       DO UPDATE SET marks_obtained = $3, updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [student_id, assessment_id, marks_obtained]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating/updating student marks:', error)
    res.status(500).json({ error: 'Failed to create/update student marks' })
  }
})

// Update marks by CO and Bloom level
router.put('/by-co-bloom', async (req, res) => {
  try {
    const { student_id, co_code, bloom_level, marks_obtained } = req.body

    if (!student_id || !co_code || !bloom_level || marks_obtained === undefined) {
      return res.status(400).json({ error: 'Missing required fields: student_id, co_code, bloom_level, marks_obtained' })
    }

    // Get CO and Bloom level IDs
    const coResult = await pool.query('SELECT id FROM course_outcomes WHERE code = $1', [co_code])
    if (coResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course outcome not found' })
    }
    const coId = coResult.rows[0].id

    const bloomResult = await pool.query('SELECT id FROM bloom_levels WHERE name = $1', [bloom_level])
    if (bloomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bloom level not found' })
    }
    const bloomLevelId = bloomResult.rows[0].id

    // Find all assessments that contribute to this CO and Bloom level
    const assessmentsQuery = `
      SELECT 
        a.id as assessment_id,
        a.max_marks,
        acm.max_marks as co_bloom_max_marks,
        acm.weight,
        COALESCE(sm.marks_obtained, 0) as current_marks
      FROM assessment_co_mapping acm
      JOIN assessments a ON acm.assessment_id = a.id
      LEFT JOIN student_marks sm ON sm.student_id = $1 AND sm.assessment_id = a.id
      WHERE acm.co_id = $2 AND acm.bloom_level_id = $3
    `
    const assessmentsResult = await pool.query(assessmentsQuery, [student_id, coId, bloomLevelId])

    if (assessmentsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No assessments found for this CO and Bloom level combination' })
    }

    // Calculate total max marks for this CO-Bloom combination
    let totalMaxMarks = 0
    assessmentsResult.rows.forEach(row => {
      totalMaxMarks += parseFloat(row.co_bloom_max_marks) * parseFloat(row.weight)
    })

    if (totalMaxMarks === 0) {
      return res.status(400).json({ error: 'Cannot update: max marks is zero for this combination' })
    }

    // Calculate the ratio needed
    const targetMarks = parseFloat(marks_obtained)
    const ratio = targetMarks / totalMaxMarks

    // Update each assessment proportionally
    const updates = []
    for (const row of assessmentsResult.rows) {
      const assessmentMaxMarks = parseFloat(row.max_marks)
      const coBloomMaxMarks = parseFloat(row.co_bloom_max_marks)
      const weight = parseFloat(row.weight)
      const currentMarks = parseFloat(row.current_marks)

      // Calculate current contribution from this CO-Bloom
      const currentContribution = assessmentMaxMarks > 0 
        ? (currentMarks / assessmentMaxMarks) * coBloomMaxMarks * weight
        : 0

      // Calculate what the contribution should be
      const targetContribution = coBloomMaxMarks * weight * ratio

      // Calculate the adjustment needed
      const adjustment = targetContribution - currentContribution

      // Calculate new total marks for the assessment
      const newTotalMarks = Math.max(0, currentMarks + (adjustment * assessmentMaxMarks / (coBloomMaxMarks * weight)))

      // Update the assessment marks
      await pool.query(
        `INSERT INTO student_marks (student_id, assessment_id, marks_obtained) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (student_id, assessment_id) 
         DO UPDATE SET marks_obtained = $3, updated_at = CURRENT_TIMESTAMP`,
        [student_id, row.assessment_id, newTotalMarks]
      )

      updates.push({
        assessment_id: row.assessment_id,
        old_marks: currentMarks,
        new_marks: newTotalMarks
      })
    }

    res.json({
      message: 'Marks updated successfully',
      student_id,
      co_code,
      bloom_level,
      marks_obtained: targetMarks,
      updates
    })
  } catch (error) {
    console.error('Error updating marks by CO-Bloom:', error)
    res.status(500).json({ error: 'Failed to update marks', details: error.message })
  }
})

export default router

