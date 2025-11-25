import { pool } from '../config/database.js'

/**
 * Distribute assessment-CO mappings across all Bloom levels
 * This creates mappings for all Bloom levels so marks can be distributed
 */
async function distributeBloomLevels() {
  try {
    console.log('🔄 Distributing marks across Bloom levels...')
    
    // Get all Bloom levels
    const bloomResult = await pool.query(
      'SELECT id, name, level_order FROM bloom_levels ORDER BY level_order'
    )
    const bloomLevels = bloomResult.rows
    
    if (bloomLevels.length === 0) {
      console.log('No Bloom levels found. Please run init-db first.')
      return
    }
    
    console.log(`Found ${bloomLevels.length} Bloom levels`)
    
    // Get all existing assessment-CO mappings (currently only for Apply)
    const mappingsResult = await pool.query(`
      SELECT DISTINCT
        acm.assessment_id,
        acm.co_id,
        a.name as assessment_name,
        co.code as co_code,
        acm.max_marks,
        bl.name as current_bloom
      FROM assessment_co_mapping acm
      JOIN assessments a ON acm.assessment_id = a.id
      JOIN course_outcomes co ON acm.co_id = co.id
      JOIN bloom_levels bl ON acm.bloom_level_id = bl.id
      ORDER BY a.name, co.code
    `)
    
    console.log(`Found ${mappingsResult.rows.length} existing mappings`)
    
    // Distribution weights: Remember, Understand, Apply, Analyze, Evaluate, Create
    // Adjust these percentages based on typical assessment distribution
    const distributionWeights = {
      'Remember': 0.15,    // 15%
      'Understand': 0.20,  // 20%
      'Apply': 0.30,       // 30%
      'Analyze': 0.20,     // 20%
      'Evaluate': 0.10,    // 10%
      'Create': 0.05       // 5%
    }
    
    let mappingsCreated = 0
    let mappingsUpdated = 0
    
    for (const mapping of mappingsResult.rows) {
      const totalMaxMarks = parseFloat(mapping.max_marks)
      
      // Create mappings for all Bloom levels
      for (const bloomLevel of bloomLevels) {
        const weight = distributionWeights[bloomLevel.name] || 0.15
        const bloomMaxMarks = totalMaxMarks * weight
        
        // Check if mapping already exists
        const existingResult = await pool.query(
          `SELECT id FROM assessment_co_mapping 
           WHERE assessment_id = $1 AND co_id = $2 AND bloom_level_id = $3`,
          [mapping.assessment_id, mapping.co_id, bloomLevel.id]
        )
        
        if (existingResult.rows.length > 0) {
          // Update existing mapping
          await pool.query(
            `UPDATE assessment_co_mapping 
             SET max_marks = $1, weight = $2
             WHERE assessment_id = $3 AND co_id = $4 AND bloom_level_id = $5`,
            [bloomMaxMarks, weight, mapping.assessment_id, mapping.co_id, bloomLevel.id]
          )
          mappingsUpdated++
        } else {
          // Create new mapping
          await pool.query(
            `INSERT INTO assessment_co_mapping (assessment_id, co_id, bloom_level_id, max_marks, weight)
             VALUES ($1, $2, $3, $4, $5)`,
            [mapping.assessment_id, mapping.co_id, bloomLevel.id, bloomMaxMarks, weight]
          )
          mappingsCreated++
        }
      }
    }
    
    console.log('\n✅ Distribution completed!')
    console.log(`   - New mappings created: ${mappingsCreated}`)
    console.log(`   - Existing mappings updated: ${mappingsUpdated}`)
    console.log(`   - Total mappings: ${mappingsCreated + mappingsUpdated}`)
    console.log('\nDistribution weights used:')
    Object.entries(distributionWeights).forEach(([level, weight]) => {
      console.log(`   - ${level}: ${(weight * 100).toFixed(0)}%`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error distributing Bloom levels:', error)
    process.exit(1)
  }
}

distributeBloomLevels()

