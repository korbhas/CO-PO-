import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './COPoMapping.css'

function COPoMapping() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const [matrixData, setMatrixData] = useState(null)
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSubject()
    fetchCOPoMapping()
  }, [subjectId])

  const fetchSubject = async () => {
    try {
      const response = await fetch(`/api/subjects/${subjectId}`)
      if (!response.ok) throw new Error('Failed to fetch subject')
      const data = await response.json()
      setSubject(data)
    } catch (err) {
      console.error('Error fetching subject:', err)
    }
  }

  const fetchCOPoMapping = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/co-po-mapping/matrix')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch CO-PO mapping`)
      }
      const data = await response.json()
      
      // Check if data has error field
      if (data.error) {
        throw new Error(data.error)
      }
      
      setMatrixData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching CO-PO mapping:', err)
      setError(err.message || 'Failed to fetch CO-PO mapping. Please ensure the data has been imported.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewResults = () => {
    navigate(`/subject/${subjectId}/results`)
  }

  const handleBack = () => {
    navigate('/subjects')
  }

  if (loading) {
    return (
      <div className="co-po-mapping-container">
        <div className="loading">Loading CO-PO mapping...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="co-po-mapping-container">
        <div className="error-message">
          <h2>⚠️ Error Loading CO-PO Mapping</h2>
          <p><strong>Error:</strong> {error}</p>
          <div className="error-steps">
            <h3>Possible Solutions:</h3>
            <ol>
              <li>Check if the database is connected (check backend logs)</li>
              <li>Make sure the database has been initialized: <code>cd server && npm run init-db</code></li>
              <li>Import CO-PO mapping data: <code>POST /api/import/po-attainment</code></li>
              <li>Check if PostgreSQL is running</li>
            </ol>
          </div>
        </div>
        <button className="back-button" onClick={handleBack}>Back to Subjects</button>
      </div>
    )
  }

  if (!matrixData || !matrixData.matrix || (Array.isArray(matrixData.matrix) && matrixData.matrix.length === 0)) {
    return (
      <div className="co-po-mapping-container">
        <div className="no-data-message">
          <h2>No CO-PO Mapping Data Available</h2>
          <p>The CO-PO mapping data has not been imported yet.</p>
          <p>Please import the PO_ATTAINMENT.csv file first.</p>
        </div>
        <button className="back-button" onClick={handleBack}>Back to Subjects</button>
      </div>
    )
  }

  const { matrix, program_outcomes, course_outcomes } = matrixData

  return (
    <div className="co-po-mapping-container">
      <div className="header-section">
        <button className="back-button" onClick={handleBack}>← Back to Subjects</button>
        <h1>CO-PO Mapping</h1>
        {subject && (
          <div className="subject-info">
            <h2>{subject.name}</h2>
            <p className="subject-code">{subject.code}</p>
          </div>
        )}
      </div>

      <div className="mapping-table-wrapper">
        <table className="co-po-mapping-table">
          <thead>
            <tr>
              <th rowSpan="2" className="co-header">Course Outcome (CO)</th>
              {program_outcomes.map(po => (
                <th key={po.id} className="po-header">{po.code}</th>
              ))}
            </tr>
            <tr>
              {program_outcomes.map(po => (
                <th key={po.id} className="po-subheader">{po.description || ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.co_id}>
                <td className="co-cell">
                  <div className="co-code">{row.co_code}</div>
                  <div className="co-description">{row.co_description || ''}</div>
                </td>
                {program_outcomes.map(po => {
                  const mapping = row.po_mappings[po.code]
                  const correlationValue = mapping?.correlation_value
                  return (
                    <td key={po.id} className={`po-cell ${correlationValue ? 'has-value' : 'no-value'}`}>
                      {correlationValue || '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend-section">
        <div className="legend">
          <span className="legend-item">
            <span className="legend-value">1</span> = Low Correlation
          </span>
          <span className="legend-item">
            <span className="legend-value">2</span> = Medium Correlation
          </span>
          <span className="legend-item">
            <span className="legend-value">3</span> = High Correlation
          </span>
          <span className="legend-item">
            <span className="legend-value">-</span> = No Correlation
          </span>
        </div>
      </div>

      <div className="action-section">
        <button className="results-button" onClick={handleViewResults}>
          View Results
        </button>
      </div>
    </div>
  )
}

export default COPoMapping

