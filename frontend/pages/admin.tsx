import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { API_BASE_URL } from '../lib/config'

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const endpoint = activeTab === 'login' ? '/api/login' : '/api/register'
    const payload = activeTab === 'login' 
      ? { email: formData.email, password: formData.password }
      : formData

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('adminUser', formData.username || formData.email.split('@')[0])
        
        // Show success message
        alert(`${activeTab === 'login' ? 'Login' : 'Registration'} successful! Redirecting to forum...`)
        
        // Redirect to forum
        router.push('/forum')
      } else {
        setError(data.detail || 'Authentication failed')
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError('Network error. Please check if the backend is running.')
    } finally {
      setLoading(false)
    }
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
            <Link href="/forum" className="nav-link">Forum</Link>
          </div>
        </nav>
      </header>

      <div className="auth-container">
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Admin Portal</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '24px' }}>
            Login or create an account to manage questions
          </p>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
            <button
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {activeTab === 'signup' && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div style={{ color: '#dc3545', marginBottom: '16px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Please wait...' : (activeTab === 'login' ? 'Login' : 'Create Account')}
            </button>
          </form>

          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '14px' }}>
            <strong>Test the app:</strong>
            <br />
            1. Create an admin account here
            <br />
            2. Go to Forum to manage questions
            <br />
            3. Change question status as admin
          </div>
        </div>
      </div>
    </div>
  )
}