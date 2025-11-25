import { useState, useEffect } from 'react'
import './MarksTable.css'

function MarksTable() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [courseOutcomes, setCourseOutcomes] = useState([])
  const [bloomLevels, setBloomLevels] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getMark = (student, coCode, bloomLevel) => {
    return student.marks[coCode]?.[bloomLevel] || 0
  }

  if (loading) {
    return <div className="marks-table-loading">Loading marks data...</div>
  }

  if (error) {
    return <div className="marks-table-error">Error: {error}</div>
  }

  if (data.length === 0) {
    return <div className="marks-table-empty">No student marks data available</div>
  }

  return (
    <div className="marks-table-container">
      <h2>Student Marks by Course Outcome and Bloom Level</h2>
      <div className="table-wrapper">
        <table className="marks-table">
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
                        {mark.toFixed(2)}
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

export default MarksTable

