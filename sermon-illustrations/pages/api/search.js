import axios from 'axios'
import Anthropic from '@anthropic-ai/sdk'

const YT_API = 'https://www.googleapis.com/youtube/v3'

function buildSearchQuery(query, typeFilter) {
  const typeMap = {
    prop: 'pastor prop object stage sermon adult',
    demo: 'pastor demonstration congregation stage sermon',
    visual: 'pastor visual aid sermon illustration adult',
    story: 'pastor story illustration sermon',
  }
  const typeSuffix = typeMap[typeFilter] || 'pastor sermon illustration stage adult church'
  return `${query} ${typeSuffix}`
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
      headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 5000,
    })
    const captionMatch = res.data.match(/"captionTracks":(\[.*?\])/)
    if (!captionMatch) return null
    const tracks = JSON.parse(captionMatch[1])
    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0]
    if (!enTrack) return null
    const xmlRes = await axios.get(enTrack.baseUrl, { timeout: 5000 })
    return xmlRes.data
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)
  } catch { return null }
}

async function analyzeIllustration(video, transcript, searchQuery) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const context = transcript
    ? `Transcript:\n${transcript}`
    : `Title: ${video.title}\nDescription: ${video.description}`

  const prompt = `You are a sermon research assistant. Analyze this video for a pastor looking for sermon illustrations.

Search query: "${searchQuery}"
Title: ${video.title}
Channel: ${video.channel}
${context}

Return a JSON object with these exact fields. No markdown, no backticks, just raw JSON:
{"type":"prop","theme":"faith","passage":"John 3:16","summary":"Description of what happens and the spiritual point.","prop":"object name or null","keyPoint":"One takeaway sentence.","impact":80,"reusability":75}`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = res.content.map(b => b.text || '').join('').trim()
  
  // Strip any markdown fences if present
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  
  // Find the JSON object even if there's extra text around it
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in: ' + cleaned.slice(0, 100))
  
  return JSON.parse(jsonMatch[0])
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { query, type } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })

  try {
    const videos = await searchYouTube(query, type, 6)

    const results = await Promise.all(
      videos.slice(0, 5).map(async (video) => {
        try {
          const transcript = await getTranscript(video.id)
          const analysis = await analyzeIllustration(video, transcript, query)
          return {
            videoId: video.id,
            title: video.title,
            channel: video.channel,
            thumbnail: video.thumbnail,
            url: video.url,
            viewCount: video.viewCount,
            publishedAt: video.publishedAt,
            type: analysis.type || 'prop',
            theme: analysis.theme || 'faith',
            passage: analysis.passage || '',
            summary: analysis.summary || video.description,
            prop: analysis.prop || null,
            keyPoint: analysis.keyPoint || '',
            impact: analysis.impact || 75,
            reusability: analysis.reusability || 75,
          }
        } catch (e) {
          console.error('FAILED:', video.title, e.message)
          return null
        }
      })
    )

    const final = results.filter(Boolean)
    console.log('FINAL COUNT:', final.length)
    res.json({ results: final })
  } catch (err) {
    console.error('HANDLER ERROR:', err.message)
    res.status(500).json({ error: err.message || 'Search failed' })
  }
}
