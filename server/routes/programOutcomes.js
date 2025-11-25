import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM program_outcomes ORDER BY code')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching program outcomes:', error)
    res.status(500).json({ error: 'Failed to fetch program outcomes' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM program_outcomes WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program outcome not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching program outcome:', error)
    res.status(500).json({ error: 'Failed to fetch program outcome' })
  }
})

export default router

