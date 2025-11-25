import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM course_outcomes ORDER BY code')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching course outcomes:', error)
    res.status(500).json({ error: 'Failed to fetch course outcomes' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM course_outcomes WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course outcome not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching course outcome:', error)
    res.status(500).json({ error: 'Failed to fetch course outcome' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { code, description } = req.body
    const result = await pool.query(
      'INSERT INTO course_outcomes (code, description) VALUES ($1, $2) RETURNING *',
      [code, description]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating course outcome:', error)
    res.status(500).json({ error: 'Failed to create course outcome' })
  }
})

export default router

