import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SubjectList from './pages/SubjectList'
import COPoMapping from './pages/COPoMapping'
import SubjectResults from './pages/SubjectResults'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Navigate to="/subjects" replace />} />
          <Route path="/subjects" element={<SubjectList />} />
          <Route path="/subject/:subjectId/mapping" element={<COPoMapping />} />
          <Route path="/subject/:subjectId/results" element={<SubjectResults />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

