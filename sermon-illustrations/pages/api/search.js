import axios from 'axios'
import Anthropic from '@anthropic-ai/sdk'

const YT_API = 'https://www.googleapis.com/youtube/v3'

function buildSearchQuery(query, typeFilter) {
  const base = `sermon illustration "${query}"`
  const typeMap = {
    prop: 'object lesson prop sermon',
    demo: 'sermon demonstration stage crowd',
    visual: 'visual aid sermon',
    story: 'sermon story illustration',
  }
  const typeSuffix = typeMap[typeFilter] || 'sermon object lesson'
  return `${base} ${typeSuffix}`
}

async function searchYouTube(query, typeFilter = 'all', maxResults = 6) {
  const searchQuery = buildSearchQuery(query, typeFilter)
  const searchRes = await axios.get(`${YT_API}/search`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      q: searchQuery,
      part: 'snippet',
      type: 'video',
      maxResults,
      relevanceLanguage: 'en',
      videoCaption: 'closedCaption',
    },
  })
  const videoIds = searchRes.data.items.map(v => v.id.videoId).join(',')
  const statsRes = await axios.get(`${YT_API}/videos`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      id: videoIds,
      part: 'statistics,contentDetails,snippet',
    },
  })
  return statsRes.data.items.map(video => ({
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    description: video.snippet.description,
    thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
    publishedAt: video.snippet.publishedAt,
    viewCount: parseInt(video.statistics.viewCount || 0),
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }))
}

async function getTranscript(videoId) {
  try {
    const res = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }
    })
    const captionMatch = res.data.match(/"captionTracks":(\[.*?\])/)
    if (!captionMatch) return null
    const tracks = JSON.parse(captionMatch[1])
    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0]
    if (!enTrack) return null
    const xmlRes = await axios.get(enTrack.baseUrl)
    return xmlRes.data.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 4000)
  } catch { return null }
}

async function analyzeIllustration(video, transcript, searchQuery) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const context = transcript ? `Transcript:\n${transcript}` : `Title: ${video.title}\nDescription: ${video.description}`
  const prompt = `You are a sermon research assistant. Search query: "${searchQuery}"
Title: ${video.title}, Channel: ${video.channel}
${context}
Return JSON only: {"isIllustration":true,"type":"prop|demo|visual|story","theme":"theme","passage":"scripture","summary":"what happened on stage","prop":"object or null","keyPoint":"one takeaway","impact":85,"reusability":80}
If not a sermon illustration, set isIllustration to false.`
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { query, type } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })
  try {
    const videos = await searchYouTube(query, type, 6)
    const results = await Promise.all(
      videos.slice(0, 4).map(async (video) => {
        try {
          const transcript = await getTranscript(video.id)
          const analysis = await analyzeIllustration(video, transcript, query)
          if (!analysis.isIllustration) return null
          return { videoId: video.id, ...video, ...analysis }
        } catch { return null }
      })
    )
    res.json({ results: results.filter(Boolean) })
  } catch (err) {
    console.error('Search error:', err)
    res.status(500).json({ error: err.message || 'Search failed' })
  }
}
