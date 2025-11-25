import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM assessments ORDER BY date DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching assessments:', error)
    res.status(500).json({ error: 'Failed to fetch assessments' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM assessments WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching assessment:', error)
    res.status(500).json({ error: 'Failed to fetch assessment' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, assessment_type, date, max_marks } = req.body
    const result = await pool.query(
      'INSERT INTO assessments (name, assessment_type, date, max_marks) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, assessment_type, date, max_marks]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating assessment:', error)
    res.status(500).json({ error: 'Failed to create assessment' })
  }
})

export default router

