import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './SubjectResults.css'

function SubjectResults() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [courseOutcomes, setCourseOutcomes] = useState([])
  const [bloomLevels, setBloomLevels] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSubject()
    fetchData()
  }, [subjectId])

  const fetchSubject = async () => {
    try {
      const response = await fetch(`/api/subjects/${subjectId}`)
      if (!response.ok) {
        console.warn('Subject not found, continuing without subject info')
        return
      }
      const data = await response.json()
      setSubject(data)
    } catch (err) {
      console.error('Error fetching subject:', err)
      // Continue without subject info if fetch fails
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [marksRes, coRes, bloomRes] = await Promise.all([
        fetch('/api/student-marks'),
        fetch('/api/course-outcomes'),
        fetch('/api/bloom-levels')
      ])

      if (!marksRes.ok || !coRes.ok || !bloomRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [marksData, coData, bloomData] = await Promise.all([
        marksRes.json(),
        coRes.json(),
        bloomRes.json()
      ])

      setData(marksData)
      setCourseOutcomes(coData.sort((a, b) => a.code.localeCompare(b.code)))
      setBloomLevels(bloomData.sort((a, b) => a.level_order - b.level_order))
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to fetch student marks data')
    } finally {
      setLoading(false)
    }
  }

  const getMark = (student, coCode, bloomLevel) => {
    return student.marks[coCode]?.[bloomLevel] || 0
  }

  const handleBack = () => {
    navigate(`/subject/${subjectId}/mapping`)
  }

  const handleEditClick = (studentId, coCode, bloomLevel, currentMark) => {
    if (!isEditMode) return
    setEditingCell(`${studentId}-${coCode}-${bloomLevel}`)
    setEditValue(currentMark > 0 ? currentMark.toFixed(2) : '')
  }

  const handleSaveMark = async (studentId, coCode, bloomLevel) => {
    const marksValue = parseFloat(editValue)
    if (isNaN(marksValue) || marksValue < 0) {
      alert('Please enter a valid number')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/student-marks/by-co-bloom', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: studentId,
          co_code: coCode,
          bloom_level: bloomLevel,
          marks_obtained: marksValue
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update marks' }))
        throw new Error(errorData.error || 'Failed to update marks')
      }

      // Refresh data to show updated marks
      await fetchData()
      setEditingCell(null)
      setEditValue('')
    } catch (err) {
      console.error('Error updating marks:', err)
      alert(`Failed to update marks: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyPress = (e, studentId, coCode, bloomLevel) => {
    if (e.key === 'Enter') {
      handleSaveMark(studentId, coCode, bloomLevel)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  if (loading) {
    return (
      <div className="subject-results-container">
        <div className="loading">Loading student marks...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="subject-results-container">
        <div className="error-message">
          <h2>⚠️ Error Loading Student Marks</h2>
          <p><strong>Error:</strong> {error}</p>
          <div className="error-steps">
            <h3>Possible Solutions:</h3>
            <ol>
              <li>Check if the database is connected (check backend logs)</li>
              <li>Make sure the database has been initialized: <code>cd server && npm run init-db</code></li>
              <li>Import student marks data: <code>POST /api/import/co-attainment</code></li>
              <li>Check if PostgreSQL is running</li>
            </ol>
          </div>
        </div>
        <button className="back-button" onClick={handleBack}>← Back to CO-PO Mapping</button>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="subject-results-container">
        <div className="no-data-message">
          <h2>No Student Marks Data Available</h2>
          <p>The student marks data has not been imported yet.</p>
          <p>Please import the CO_ATTAINMENT.csv file first.</p>
        </div>
        <button className="back-button" onClick={handleBack}>← Back to CO-PO Mapping</button>
      </div>
    )
  }

  return (
    <div className="subject-results-container">
      <div className="header-section">
        <button className="back-button" onClick={handleBack}>← Back to CO-PO Mapping</button>
        <div className="header-controls">
          <h1>Student Marks - Results</h1>
          <button 
            className={`edit-mode-button ${isEditMode ? 'active' : ''}`}
            onClick={() => {
              setIsEditMode(!isEditMode)
              setEditingCell(null)
            }}
          >
            {isEditMode ? '✓ Exit Edit Mode' : '✎ Edit Marks'}
          </button>
        </div>
        {subject && (
          <div className="subject-info">
            <h2>{subject.name}</h2>
            <p className="subject-code">{subject.code}</p>
          </div>
        )}
      </div>

      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th rowSpan="2" className="student-col">Student</th>
              {courseOutcomes.map(co => (
                <th key={co.id} colSpan={bloomLevels.length} className="co-header">
                  {co.code}
                </th>
              ))}
            </tr>
            <tr>
              {courseOutcomes.map(co =>
                bloomLevels.map(bloom => (
                  <th key={`${co.id}-${bloom.id}`} className="bloom-header">
                    {bloom.name}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {data.map(student => (
              <tr key={student.student_id}>
                <td className="student-name">
                  <div className="student-roll">{student.roll_number}</div>
                  <div className="student-name-text">{student.student_name}</div>
                </td>
                {courseOutcomes.map(co =>
                  bloomLevels.map(bloom => {
                    const mark = getMark(student, co.code, bloom.name)
                    const cellKey = `${student.student_id}-${co.code}-${bloom.name}`
                    const isEditing = editingCell === cellKey
                    
                    return (
                      <td 
                        key={`${student.student_id}-${co.id}-${bloom.id}`} 
                        className={`mark-cell ${isEditMode ? 'editable' : ''} ${isEditing ? 'editing' : ''}`}
                        onClick={() => handleEditClick(student.student_id, co.code, bloom.name, mark)}
                        title={isEditMode ? 'Click to edit' : ''}
                      >
                        {isEditing ? (
                          <div className="edit-input-wrapper">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleKeyPress(e, student.student_id, co.code, bloom.name)}
                              onBlur={() => handleSaveMark(student.student_id, co.code, bloom.name)}
                              autoFocus
                              disabled={saving}
                              className="mark-edit-input"
                            />
                            <div className="edit-actions">
                              <button 
                                className="save-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSaveMark(student.student_id, co.code, bloom.name)
                                }}
                                disabled={saving}
                              >
                                ✓
                              </button>
                              <button 
                                className="cancel-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelEdit()
                                }}
                                disabled={saving}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          mark > 0 ? mark.toFixed(2) : '-'
                        )}
                      </td>
                    )
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SubjectResults

