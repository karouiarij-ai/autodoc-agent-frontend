import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

type JobStatus = "pending" | "running" | "done" | "error";

interface JobResponse {
  id: string;
  repo_url: string;
  status: JobStatus;
  result_url?: string | null;
  error_message?: string | null;
}

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateGitHubUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === "github.com" && urlObj.pathname.length > 1;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setJob(null);
    setJobId(null);

    if (!repoUrl) {
      setError("Please enter a repository URL");
      return;
    }

    if (!validateGitHubUrl(repoUrl)) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    try {
      setLoading(true);
      abortControllerRef.current = new AbortController();

      const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create job");
      }

      const data: JobResponse = await res.json();
      setJobId(data.id);
      setJob(data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unexpected error occurred");
        }
      } else {
        setError("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const abortController = new AbortController();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
          signal: abortController.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to fetch job status");
        }

        const data: JobResponse = await res.json();
        setJob(data);

        if (data.status === "done" || data.status === "error") {
          clearInterval(interval);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error fetching job status:", err);
        }
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, [jobId]);

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "running":
        return "⚙️";
      case "done":
        return "✅";
      case "error":
        return "❌";
      default:
        return "📄";
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Autonomous Codebase Documenter</h1>
        <p>
          Transform your GitHub repositories into comprehensive documentation
          with AI-powered analysis
        </p>
      </header>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="repo-url">GitHub Repository URL</label>
            <input
              id="repo-url"
              type="url"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={loading}
              required
              aria-label="GitHub repository URL"
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            aria-label={loading ? "Submitting..." : "Generate documentation"}
          >
            {loading && <span className="spinner" aria-hidden="true"></span>}
            {loading ? "Creating Job..." : "Generate Documentation"}
          </button>
        </form>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {job && (
        <div className="job-card" role="region" aria-label="Job status">
          <div className="job-header">
            <span className="job-id" title={job.id}>
              Job ID: {job.id.slice(0, 8)}...
            </span>
            <span className={`status-badge ${job.status}`}>
              <span
                className="status-indicator"
                aria-hidden="true"
              ></span>
              {getStatusIcon(job.status)} {job.status}
            </span>
          </div>

          <div className="job-info">
            <div className="info-row">
              <span className="info-label">Repository</span>
              <span className="info-value">{job.repo_url}</span>
            </div>

            {job.status === "running" && (
              <div className="info-row">
                <span className="info-label">Progress</span>
                <span className="info-value">
                  Processing your repository...
                </span>
              </div>
            )}

            {job.error_message && (
              <div className="info-row">
                <span className="info-label">Error Details</span>
                <span className="info-value" style={{ color: "var(--error-color)" }}>
                  {job.error_message}
                </span>
              </div>
            )}
          </div>

          {job.result_url && job.status === "done" && (
            <a
              href={job.result_url}
              target="_blank"
              rel="noopener noreferrer"
              className="result-link"
            >
              🚀 View Generated Documentation
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
