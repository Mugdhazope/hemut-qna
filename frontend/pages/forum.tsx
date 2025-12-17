import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_BASE_URL, WS_URL } from '../lib/config'

interface Question {
  _id: string
  author: string
  message: string
  status: 'pending' | 'escalated' | 'answered'
  created_at: string
  answers: Answer[]
}

interface Answer {
  author: string
  content: string
  created_at: string
}

export default function Forum() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState({ author: '', message: '' })
  const [answerForms, setAnswerForms] = useState<{ [key: string]: { author: string, answer: string } }>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [adminUser, setAdminUser] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestions()
    
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('adminUser')
    if (token) {
      setIsAdmin(true)
      setAdminUser(user)
    }

    // WebSocket connection with error handling
    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket(WS_URL)
        
        websocket.onopen = () => {
          console.log('WebSocket connected')
          setWsConnected(true)
        }
        
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'new_question') {
              setQuestions(prev => [data.data, ...prev])
            } else if (data.type === 'question_updated') {
              setQuestions(prev => prev.map(q => q._id === data.data._id ? data.data : q))
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }
        
        websocket.onclose = () => {
          console.log('WebSocket disconnected')
          setWsConnected(false)
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }
        
        websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          setWsConnected(false)
        }
        
        setWs(websocket)
        
        return websocket
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        setWsConnected(false)
        return null
      }
    }

    const websocket = connectWebSocket()

    return () => {
      if (websocket) {
        websocket.close()
      }
    }
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions`)
      const data = await response.json()
      setQuestions(data)
    } catch (error) {
      console.error('Error fetching questions:', error)
    }
  }

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newQuestion.message.trim()) {
      alert('Please enter a question')
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}/api/questions`, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          setNewQuestion({ author: '', message: '' })
        } else {
          alert('Error submitting question')
        }
      }
    }
    
    xhr.send(JSON.stringify(newQuestion))
  }

  const submitAnswer = async (questionId: string) => {
    const answerData = answerForms[questionId]
    if (!answerData?.answer.trim()) {
      alert('Please enter an answer')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answerData)
      })

      if (response.ok) {
        setAnswerForms(prev => ({ ...prev, [questionId]: { author: '', answer: '' } }))
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }

  const updateQuestionStatus = async (questionId: string, status: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch(`${API_BASE_URL}/api/questions/${questionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('adminUser')
    setIsAdmin(false)
    setAdminUser(null)
    alert('Logged out successfully')
  }

  return (
    <div>
      <header className="header">
        <nav className="nav">
          <div className="logo">
            <span style={{ marginRight: '8px' }}>💬</span>
            Hemut Q&A
          </div>
          <div className="nav-links">
            <Link href="/" className="nav-link">Home</Link>
            {isAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  👤 Admin: {adminUser || 'User'}
                </span>
                <span style={{ 
                  color: wsConnected ? '#28a745' : '#dc3545', 
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: wsConnected ? '#28a745' : '#dc3545' 
                  }}></span>
                  {wsConnected ? 'Live' : 'Offline'}
                </span>
                <button onClick={handleLogout} className="btn-secondary">
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/admin" className="btn-primary">Admin Login</Link>
            )}
          </div>
        </nav>
      </header>

      <div className="container">
        <div className="two-column">
          <div className="card">
            <h2>Ask a Question</h2>
            <form onSubmit={submitQuestion}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Your name"
                  className="form-input"
                  value={newQuestion.author}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder="Type your question here..."
                  className="form-textarea"
                  value={newQuestion.message}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, message: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Submit Question
              </button>
            </form>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Questions ({questions.length})</h2>
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-dot legend-escalated"></div>
                  Escalated
                </div>
                <div className="legend-item">
                  <div className="legend-dot legend-pending"></div>
                  Pending
                </div>
                <div className="legend-item">
                  <div className="legend-dot legend-answered"></div>
                  Answered
                </div>
              </div>
            </div>

            {questions.map((question) => (
              <div key={question._id} className="question-item">
                <div className="question-header">
                  <div className="question-meta">
                    {question.author} • {formatDate(question.created_at)}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`status-badge status-${question.status}`}>
                      {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                    </span>
                    {isAdmin && (
                      <select
                        value={question.status}
                        onChange={(e) => updateQuestionStatus(question._id, e.target.value)}
                        style={{ padding: '4px', fontSize: '12px' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="escalated">Escalated</option>
                        <option value="answered">Answered</option>
                      </select>
                    )}
                  </div>
                </div>
                
                <div className="question-content">
                  {question.message}
                </div>

                {question.answers.length > 0 && (
                  <div className="answers-section">
                    <h4 style={{ marginBottom: '12px' }}>Answers:</h4>
                    {question.answers.map((answer, index) => (
                      <div key={index} className="answer-item">
                        <div className="answer-meta">
                          {answer.author} • {formatDate(answer.created_at)}
                        </div>
                        <div>{answer.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="answer-form">
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Your name"
                      className="form-input"
                      style={{ flex: '0 0 150px' }}
                      value={answerForms[question._id]?.author || ''}
                      onChange={(e) => setAnswerForms(prev => ({
                        ...prev,
                        [question._id]: { ...prev[question._id], author: e.target.value }
                      }))}
                    />
                    <textarea
                      placeholder="Type your answer..."
                      className="form-textarea"
                      style={{ flex: 1, minHeight: '60px' }}
                      value={answerForms[question._id]?.answer || ''}
                      onChange={(e) => setAnswerForms(prev => ({
                        ...prev,
                        [question._id]: { ...prev[question._id], answer: e.target.value }
                      }))}
                    />
                  </div>
                  <button
                    onClick={() => submitAnswer(question._id)}
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Add Answer
                  </button>
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="card" style={{ textAlign: 'center', color: '#666' }}>
                No questions yet. Be the first to ask!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}