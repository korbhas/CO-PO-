import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY roll_number')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching students:', error)
    res.status(500).json({ error: 'Failed to fetch students' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching student:', error)
    res.status(500).json({ error: 'Failed to fetch student' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { roll_number, name, email } = req.body
    const result = await pool.query(
      'INSERT INTO students (roll_number, name, email) VALUES ($1, $2, $3) RETURNING *',
      [roll_number, name, email]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating student:', error)
    res.status(500).json({ error: 'Failed to create student' })
  }
})

export default router

