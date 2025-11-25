import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './SubjectList.css'

function SubjectList() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subjects')
      if (!response.ok) {
        throw new Error('Failed to fetch subjects')
      }
      const data = await response.json()
      setSubjects(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching subjects:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubjectClick = (subjectId) => {
    navigate(`/subject/${subjectId}/mapping`)
  }

  if (loading) {
    return (
      <div className="subject-list-container">
        <div className="loading">Loading subjects...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="subject-list-container">
        <div className="error">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="subject-list-container">
      <div className="header">
        <h1>Select a Subject</h1>
      </div>
      
      <div className="subjects-list">
        {subjects.length === 0 ? (
          <div className="no-subjects">No subjects available</div>
        ) : (
          <table className="subjects-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="subject-row">
                  <td className="code-cell">{subject.code}</td>
                  <td className="name-cell">{subject.name}</td>
                  <td className="desc-cell">{subject.description || '-'}</td>
                  <td className="action-cell">
                    <button
                      className="view-button"
                      onClick={() => handleSubjectClick(subject.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default SubjectList

