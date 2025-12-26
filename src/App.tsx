import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

interface JobResponse {
  id: string
  repo_url: string
  status: string
  result_url: string | null
}

function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Submit job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to create job')
      }

      const data: JobResponse = await response.json()
      setJobId(data.id)
      setJobStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Poll job status
  useEffect(() => {
    if (!jobId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/jobs/${jobId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch job status')
        }

        const data: JobResponse = await response.json()
        setJobStatus(data)

        // Stop polling if job is done
        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(pollInterval)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Polling error')
        clearInterval(pollInterval)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [jobId])

  return (
    <div className="container">
      <h1>AutoDoc Agent</h1>
      <p className="subtitle">Generate documentation for your GitHub repositories</p>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
          required
          disabled={loading}
          className="input"
        />
        <button type="submit" disabled={loading || !repoUrl} className="button">
          {loading ? 'Submitting...' : 'Generate Docs'}
        </button>
      </form>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {jobStatus && (
        <div className="job-status">
          <h2>Job Status</h2>
          <div className="status-item">
            <span className="label">Job ID:</span>
            <span className="value">{jobStatus.id}</span>
          </div>
          <div className="status-item">
            <span className="label">Repository:</span>
            <span className="value">{jobStatus.repo_url}</span>
          </div>
          <div className="status-item">
            <span className="label">Status:</span>
            <span className={`status-badge status-${jobStatus.status}`}>
              {jobStatus.status}
            </span>
          </div>
          {jobStatus.result_url && (
            <div className="status-item">
              <span className="label">Result:</span>
              <a href={jobStatus.result_url} target="_blank" rel="noopener noreferrer" className="link">
                View Documentation
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
