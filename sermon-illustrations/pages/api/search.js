import { searchYouTube, getTranscript } from '../../lib/youtube'
import { analyzeIllustration } from '../../lib/claude'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { query, type } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })

  try {
    // 1. Search YouTube
    const videos = await searchYouTube(query, type, 8)

    // 2. Process each video — fetch transcript + analyze with Claude
    // Run in parallel but cap at 5 to avoid rate limits
    const toProcess = videos.slice(0, 5)

    const results = await Promise.all(
      toProcess.map(async (video) => {
        try {
          const transcript = await getTranscript(video.id)
          const analysis = await analyzeIllustration(video, transcript, query)

          if (!analysis.isIllustration) return null

          return {
            videoId: video.id,
            title: video.title,
            channel: video.channel,
            thumbnail: video.thumbnail,
            url: video.url,
            viewCount: video.viewCount,
            publishedAt: video.publishedAt,
            type: analysis.type,
            theme: analysis.theme,
            passage: analysis.passage,
            summary: analysis.summary,
            prop: analysis.prop,
            keyPoint: analysis.keyPoint,
            impact: analysis.impact,
            reusability: analysis.reusability,
          }
        } catch {
          return null
        }
      })
    )

    const filtered = results.filter(Boolean)
    res.json({ results: filtered })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Search failed' })
  }
}
