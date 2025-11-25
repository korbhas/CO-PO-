import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bloom_levels ORDER BY level_order')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching Bloom levels:', error)
    res.status(500).json({ error: 'Failed to fetch Bloom levels' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM bloom_levels WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bloom level not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching Bloom level:', error)
    res.status(500).json({ error: 'Failed to fetch Bloom level' })
  }
})

export default router

