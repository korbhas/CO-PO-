import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        cpm.id,
        co.code as co_code,
        co.description as co_description,
        po.code as po_code,
        po.description as po_description,
        cpm.correlation_value
      FROM co_po_mapping cpm
      JOIN course_outcomes co ON cpm.co_id = co.id
      JOIN program_outcomes po ON cpm.po_id = po.id
      ORDER BY co.code, po.code
    `
    const result = await pool.query(query)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching CO-PO mapping:', error)
    res.status(500).json({ 
      error: 'Failed to fetch CO-PO mapping',
      details: error.message 
    })
  }
})

router.get('/matrix', async (req, res) => {
  try {
    // Get course outcomes, program outcomes, and mappings separately
    // Use try-catch for each query to handle empty tables gracefully
    let courseOutcomes = []
    let programOutcomes = []
    let mappings = []

    try {
      const cosResult = await pool.query('SELECT * FROM course_outcomes ORDER BY code')
      courseOutcomes = cosResult.rows || []
    } catch (err) {
      console.warn('Error fetching course outcomes:', err.message)
    }

    try {
      const posResult = await pool.query('SELECT * FROM program_outcomes ORDER BY code')
      programOutcomes = posResult.rows || []
    } catch (err) {
      console.warn('Error fetching program outcomes:', err.message)
    }

    try {
      const mappingResult = await pool.query(`
        SELECT 
          co.id as co_id,
          co.code as co_code,
          co.description as co_description,
          po.id as po_id,
          po.code as po_code,
          po.description as po_description,
          cpm.correlation_value
        FROM co_po_mapping cpm
        JOIN course_outcomes co ON cpm.co_id = co.id
        JOIN program_outcomes po ON cpm.po_id = po.id
        ORDER BY co.code, po.code
      `)
      mappings = mappingResult.rows || []
    } catch (err) {
      console.warn('Error fetching CO-PO mappings:', err.message)
      // If mappings table is empty or doesn't exist, just return empty array
      mappings = []
    }

    // Build matrix even if data is empty
    const matrix = courseOutcomes.map(co => {
      const row = {
        co_id: co.id,
        co_code: co.code,
        co_description: co.description,
        po_mappings: {}
      }

      programOutcomes.forEach(po => {
        const mapping = mappings.find(
          m => m.co_id === co.id && m.po_id === po.id
        )
        row.po_mappings[po.code] = {
          po_id: po.id,
          po_code: po.code,
          po_description: po.description,
          correlation_value: mapping ? mapping.correlation_value : null
        }
      })

      return row
    })

    res.json({
      course_outcomes: courseOutcomes,
      program_outcomes: programOutcomes,
      matrix: matrix
    })
  } catch (error) {
    console.error('Error fetching CO-PO mapping matrix:', error)
    res.status(500).json({ 
      error: 'Failed to fetch CO-PO mapping matrix',
      details: error.message 
    })
  }
})

router.get('/by-co/:coId', async (req, res) => {
  try {
    const { coId } = req.params
    const query = `
      SELECT 
        cpm.id,
        co.code as co_code,
        po.code as po_code,
        po.description as po_description,
        cpm.correlation_value
      FROM co_po_mapping cpm
      JOIN course_outcomes co ON cpm.co_id = co.id
      JOIN program_outcomes po ON cpm.po_id = po.id
      WHERE cpm.co_id = $1
      ORDER BY po.code
    `
    const result = await pool.query(query, [coId])
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching CO-PO mapping:', error)
    res.status(500).json({ error: 'Failed to fetch CO-PO mapping' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { co_id, po_id, correlation_value } = req.body
    const result = await pool.query(
      'INSERT INTO co_po_mapping (co_id, po_id, correlation_value) VALUES ($1, $2, $3) RETURNING *',
      [co_id, po_id, correlation_value]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating CO-PO mapping:', error)
    res.status(500).json({ error: 'Failed to create CO-PO mapping' })
  }
})

export default router

