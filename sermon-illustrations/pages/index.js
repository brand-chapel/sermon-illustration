import { useState, useEffect } from 'react'
import Head from 'next/head'
import IllustrationCard from '../components/IllustrationCard'
import styles from '../styles/Home.module.css'

const THEMES = ['All', 'Faith', 'Grace', 'Sin', 'Redemption', 'Identity', 'Prayer', 'Mission', 'Resurrection', 'Love', 'Forgiveness']
const TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'prop', label: 'Physical prop' },
  { value: 'demo', label: 'Crowd demo' },
  { value: 'visual', label: 'Visual aid' },
  { value: 'story', label: 'Story/analogy' },
]

export default function Home() {
  const [tab, setTab] = useState('search')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [themeFilter, setThemeFilter] = useState('All')
  const [results, setResults] = useState([])
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    fetch('/api/library').then(r => r.json()).then(d => setLibrary(d.illustrations || []))
  }, [])

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)
    setResults([])
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), type: typeFilter }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.results || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveIllustration(illustration) {
    const res = await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ illustration }),
    })
    const data = await res.json()
    setLibrary(data.illustrations || [])
  }

  async function removeIllustration(videoId) {
    const res = await fetch('/api/library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId }),
    })
    const data = await res.json()
    setLibrary(data.illustrations || [])
  }

  const savedIds = new Set(library.map(i => i.videoId))

  const filteredLibrary = themeFilter === 'All'
    ? library
    : library.filter(i => i.theme?.toLowerCase().includes(themeFilter.toLowerCase()))

  return (
    <>
      <Head>
        <title>Sermon Illustrations</title>
        <meta name="description" content="Find high-impact sermon object illustrations from real YouTube clips" />
      </Head>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>✦</span>
            <span className={styles.logoText}>Illustrations</span>
          </div>

          <nav className={styles.nav}>
            <button className={`${styles.navBtn} ${tab==='search'?styles.navActive:''}`} onClick={() => setTab('search')}>
              Search
            </button>
            <button className={`${styles.navBtn} ${tab==='library'?styles.navActive:''}`} onClick={() => setTab('library')}>
              My Library
              {library.length > 0 && <span className={styles.count}>{library.length}</span>}
            </button>
          </nav>

          {tab === 'library' && (
            <div className={styles.sideFilters}>
              <p className={styles.filterLabel}>Filter by theme</p>
              {THEMES.map(t => (
                <button
                  key={t}
                  className={`${styles.themeBtn} ${themeFilter===t?styles.themeBtnActive:''}`}
                  onClick={() => setThemeFilter(t)}
                >{t}</button>
              ))}
            </div>
          )}
        </aside>

        <main className={styles.main}>
          {tab === 'search' && (
            <>
              <div className={styles.searchSection}>
                <h1 className={styles.heading}>Find sermon illustrations</h1>
                <p className={styles.sub}>Search real YouTube clips by passage, theme, or prop keyword</p>

                <div className={styles.searchRow}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="e.g. Matthew 16:1-12, leaven, faith, broken phone..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                  />
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={styles.typeSelect}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button className={styles.searchBtn} onClick={search} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              {loading && (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <p>Searching YouTube and analyzing with Claude...</p>
                  <p className={styles.loadingSub}>This takes 15–30 seconds while we fetch transcripts and analyze each clip</p>
                </div>
              )}

              {!loading && searched && results.length === 0 && (
                <div className={styles.empty}>No illustrations found. Try a different search term.</div>
              )}

              {!loading && !searched && (
                <div className={styles.suggestions}>
                  <p className={styles.suggestLabel}>Try searching for</p>
                  <div className={styles.suggestRow}>
                    {['Matthew 16:1-12', 'John 3:16', 'grace', 'forgiveness', 'faith', 'leaven', 'coins', 'lost sheep'].map(s => (
                      <button key={s} className={styles.suggestChip} onClick={() => { setQuery(s); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <>
                  <p className={styles.resultsMeta}>{results.length} illustrations found</p>
                  <div className={styles.grid}>
                    {results.map(r => (
                      <IllustrationCard
                        key={r.videoId}
                        result={r}
                        isSaved={savedIds.has(r.videoId)}
                        onSave={saveIllustration}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'library' && (
            <>
              <div className={styles.searchSection}>
                <h1 className={styles.heading}>My library</h1>
                <p className={styles.sub}>{library.length} saved illustration{library.length !== 1 ? 's' : ''}</p>
              </div>

              {filteredLibrary.length === 0 && (
                <div className={styles.empty}>
                  {library.length === 0
                    ? 'Nothing saved yet. Search and save illustrations to build your library.'
                    : 'No illustrations match this theme filter.'}
                </div>
              )}

              <div className={styles.grid}>
                {filteredLibrary.map(r => (
                  <IllustrationCard
                    key={r.videoId}
                    result={r}
                    onRemove={removeIllustration}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
