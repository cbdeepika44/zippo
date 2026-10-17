
import { useState } from 'react'
import './App.css'

type Detection = {
  type: string
  count: number
}

function App() {
  const [documentText, setDocumentText] = useState('')
  const [customTermsText, setCustomTermsText] = useState('')
  const [sanitizedText, setSanitizedText] = useState('')
  const [detections, setDetections] = useState<Detection[]>([])
  const [hasScanned, setHasScanned] = useState(false)

  function scanText() {
    const terms = customTermsText
      .split(',')
      .map((term) => term.trim())
      .filter(Boolean)

    let result = documentText
    const found: Detection[] = []

    const patterns: { type: string; regex: RegExp }[] = [
      {
        type: 'Email address',
        regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      },
      {
        type: 'Phone number',
        regex: /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g,
      },
    ]

    for (const pattern of patterns) {
      const matches = result.match(pattern.regex)
      if (matches?.length) {
        found.push({ type: pattern.type, count: matches.length })
        result = result.replace(pattern.regex, `[REDACTED ${pattern.type.toUpperCase()}]`)
      }
    }

    for (const term of terms) {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedTerm, 'gi')
      const matches = result.match(regex)

      if (matches?.length) {
        found.push({ type: `Custom: ${term}`, count: matches.length })
        result = result.replace(regex, '[REDACTED CUSTOM TERM]')
      }
    }

    setSanitizedText(result)
    setDetections(found)
    setHasScanned(true)
  }

  const totalDetections = detections.reduce(
    (total, detection) => total + detection.count,
    0,
  )

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <h1>ClearGate<span>AI</span></h1>
            <p>PRIVACY GATEWAY</p>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation">
          <button className="nav-item active" type="button">
            <span className="nav-icon">▦</span> Overview
          </button>
          <button className="nav-item" type="button" onClick={() => document.getElementById('scanner')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="nav-icon">⌕</span> Privacy Scanner
          </button>
          <button className="nav-item" type="button" onClick={() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="nav-icon">◷</span> Scan Results
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="security-card">
            <div className="security-icon">◇</div>
            <strong>Your data, protected.</strong>
            <p>This demo scans text locally in your browser. It does not send text to an AI provider.</p>
          </div>
          <div className="profile">
            <div className="avatar">CG</div>
            <div className="profile-text">
              <strong>Demo Workspace</strong>
              <span>Starter environment</span>
            </div>
            <span className="profile-menu">•••</span>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="topbar-right">
            <span className="environment"><span className="status-dot" /> LOCAL DEMO</span>
            <div className="top-avatar">CG</div>
          </div>
        </header>

        <div className="dashboard">
          <section className="welcome">
            <div>
              <div className="eyebrow"><span /> PRIVACY-FIRST AI WORKFLOW</div>
              <h2>Your data deserves<br />a <span>safer way forward.</span></h2>
              <p>Inspect sensitive information before it reaches an AI workflow. Start with a sample or paste your own synthetic test text.</p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="shield"><span>✓</span></div>
              <div className="art-dot dot-one" />
              <div className="art-dot dot-two" />
              <div className="art-dot dot-three" />
            </div>
          </section>

          <section className="metrics" aria-label="Dashboard overview">
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon purple">⌕</span><span className="metric-tag">THIS SESSION</span></div>
              <p className="metric-label">Scans performed</p>
              <div className="metric-value">{hasScanned ? '1' : '0'} <span>local</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon green">◇</span><span className="metric-tag">DEMO RESULT</span></div>
              <p className="metric-label">Items detected</p>
              <div className="metric-value">{totalDetections} <span>matches</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon amber">⛨</span><span className="metric-tag">PROTECTION</span></div>
              <p className="metric-label">Scan mode</p>
              <div className="metric-value mode-value">Local <span>prototype</span></div>
            </article>
          </section>

          <section className="scanner-section" id="scanner">
            <div className="section-heading">
              <div>
                <div className="section-kicker">01 / INSPECT</div>
                <h3>Privacy scanner</h3>
                <p>Find common contact details and any custom terms you specify.</p>
              </div>
              <span className="local-badge"><span className="status-dot" /> Runs in browser</span>
            </div>

            <div className="scanner-grid">
              <div className="panel input-panel">
                <div className="panel-heading">
                  <div><span className="step-number">1</span><strong>Input text</strong></div>
                  <span className="subtle-label">SYNTHETIC DATA ONLY</span>
                </div>
                <textarea
                  aria-label="Text to scan"
                  value={documentText}
                  onChange={(event) => setDocumentText(event.target.value)}
                  placeholder={'Paste synthetic test text here...\n\nExample: Contact Alex at alex@example.com or call 555-123-4567.'}
                  rows={8}
                />
                <label className="field-label" htmlFor="custom-terms">Custom terms <span>OPTIONAL</span></label>
                <input
                  id="custom-terms"
                  value={customTermsText}
                  onChange={(event) => setCustomTermsText(event.target.value)}
                  placeholder="e.g. Project Falcon, Example Corp"
                />
                <p className="field-hint">Separate terms with commas. Matching is case-insensitive.</p>
                <button className="primary-button" type="button" onClick={scanText} disabled={!documentText.trim()}>
                  <span>⌕</span> Scan for sensitive data <span className="button-arrow">→</span>
                </button>
              </div>

              <div className="panel output-panel" id="results">
                <div className="panel-heading">
                  <div><span className="step-number output-step">2</span><strong>Sanitized preview</strong></div>
                  <span className="preview-badge">PREVIEW</span>
                </div>
                {hasScanned ? (
                  <>
                    <div className="result-summary">
                      <span className="result-check">{totalDetections === 0 ? '✓' : '!'}</span>
                      <div>
                        <strong>{totalDetections === 0 ? 'No matches detected' : `${totalDetections} match${totalDetections === 1 ? '' : 'es'} detected`}</strong>
                        <p>{totalDetections === 0 ? 'No supported patterns were found.' : 'Detected matches are replaced in this preview.'}</p>
                      </div>
                    </div>
                    <div className="sanitized-box">{sanitizedText || 'Your sanitized text will appear here.'}</div>
                    {detections.length > 0 && (
                      <div className="detection-list">
                        {detections.map((detection) => (
                          <div className="detection-row" key={detection.type}>
                            <span className="detection-dot" />
                            <span>{detection.type}</span>
                            <strong>{detection.count}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="secondary-button" type="button" onClick={() => navigator.clipboard?.writeText(sanitizedText)}>
                      Copy sanitized preview ↗
                    </button>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-illustration"><span>⌕</span></div>
                    <strong>Ready when you are</strong>
                    <p>Your scan results and redacted preview will appear here.</p>
                    <div className="empty-note"><span>i</span> This prototype checks only a few patterns and may miss sensitive data.</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <footer className="page-footer">
            <span>ClearGate AI <span className="footer-separator">·</span> Privacy by design</span>
            <span><span className="status-dot" /> Frontend prototype <span className="footer-separator">·</span> No backend connected</span>
          </footer>
        </div>
      </section>
    </main>
  )
}

export default App
