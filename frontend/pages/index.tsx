import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <header className="header">
        <nav className="nav">
          <div className="logo">
            <span style={{ marginRight: '8px' }}>💬</span>
            Hemut Q&A
          </div>
          <div className="nav-links">
            <Link href="/forum" className="nav-link">Forum</Link>
            <Link href="/admin" className="btn-primary">Admin Login</Link>
          </div>
        </nav>
      </header>

      <div className="container">
        <div className="hero">
          <h1>Real-Time Q&A Dashboard</h1>
          <p>Ask questions, get answers, and engage with the community in real time.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/forum" className="btn-primary">Go to Forum</Link>
            <Link href="/admin" className="btn-secondary">Admin Login</Link>
          </div>
        </div>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Ask Questions</h3>
            <p>Submit questions without needing an account. Guest access for everyone.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Updates</h3>
            <p>See questions and answers appear instantly with WebSocket technology.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Admin Controls</h3>
            <p>Admins can escalate, prioritize, and mark questions as answered.</p>
          </div>
        </div>
      </div>
    </div>
  )
}