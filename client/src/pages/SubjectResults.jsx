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
        <h1>Student Marks - Results</h1>
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
                    return (
                      <td key={`${student.student_id}-${co.id}-${bloom.id}`} className="mark-cell">
                        {mark > 0 ? mark.toFixed(2) : '-'}
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

