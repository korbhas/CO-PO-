import express from 'express'
import { pool } from '../config/database.js'

const router = express.Router()

// Get list of subjects/courses
// For now, return a list based on available course outcomes or hardcoded subjects
router.get('/', async (req, res) => {
  try {
    // Get distinct courses from course outcomes
    // For now, return hardcoded subjects since we don't have a courses table
    // In production, this would come from a courses/subjects table
    const subjects = [
      {
        id: 1,
        code: 'CSBT100',
        name: 'Programming for Problem Solving',
        description: 'Introduction to programming concepts and problem solving'
      },
      {
        id: 2,
        code: 'CSGT200',
        name: 'Graph Theory',
        description: 'Fundamental concepts of graphs, trees, and graph algorithms'
      },
      {
        id: 3,
        code: 'CSSE300',
        name: 'Software Engineering',
        description: 'Software development lifecycle, design patterns, and project management'
      }
    ]

    res.json(subjects)
  } catch (error) {
    console.error('Error fetching subjects:', error)
    res.status(500).json({ error: 'Failed to fetch subjects' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const subjectId = parseInt(id)
    
    // Subject database (hardcoded for now)
    const subjects = {
      1: {
        id: 1,
        code: 'CSBT100',
        name: 'Programming for Problem Solving',
        description: 'Introduction to programming concepts and problem solving'
      },
      2: {
        id: 2,
        code: 'CSGT200',
        name: 'Graph Theory',
        description: 'Fundamental concepts of graphs, trees, and graph algorithms'
      },
      3: {
        id: 3,
        code: 'CSSE300',
        name: 'Software Engineering',
        description: 'Software development lifecycle, design patterns, and project management'
      }
    }
    
    const subject = subjects[subjectId]
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' })
    }

    res.json(subject)
  } catch (error) {
    console.error('Error fetching subject:', error)
    res.status(500).json({ error: 'Failed to fetch subject' })
  }
})

export default router

