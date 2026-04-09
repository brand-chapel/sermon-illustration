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
  console.log('SEARCH QUERY:', searchQuery)
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
  console.log('YOUTUBE RAW ITEMS:', searchRes.data.items?.length)
  const videoIds = searchRes.data.items.map(v => v.id.videoId).join(',')
  const statsRes = await axios.get(`${YT_API}/videos`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      id: videoIds,
      part: 'statistics,contentDetails,snippet',
    },
  })
  const videos = statsRes.data.items.map(video => ({
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    description: video.snippet.description,
    thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
    publishedAt: video.snippet.publishedAt,
    viewCount: parseInt(video.statistics.viewCount || 0),
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }))
  console.log('VIDEOS AFTER STATS:', videos.map(v => v.title))
  return videos
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
    return xmlRes.data
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
  } catch (e) {
    console.log('TRANSCRIPT FAILED:', e.message)
    return null
  }
}

async function analyzeIllustration(video, transcript, searchQuery) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const context = transcript
    ? `Transcript:\n${transcript}`
    : `Title: ${video.title}\nDescription: ${video.description}`

  const prompt = `You are a sermon research assistant helping a pastor find illustrations.

Search query: "${searchQuery}"
Title: ${video.title}
Channel: ${video.channel}
${context}

Analyze this video and return JSON only, no markdown:
{
  "type": "prop|demo|visual|story",
  "theme": "primary theological theme",
  "passage": "best scripture reference this connects to",
  "summary": "2-3 sentences describing what happens in this video and the spiritual point it makes",
  "prop": "the object or prop used, or null",
  "keyPoint": "one sentence a congregation would remember",
  "impact": 85,
  "reusability": 80
}`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = res.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
  console.log('CLAUDE RESPONSE:', text)
  return JSON.parse(text)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { query, type } = req.body
  if (!query) return res.status(400).json({ error: 'Query required' })

  try {
    const videos = await searchYouTube(query, type, 6)
    console.log('PROCESSING', videos.length, 'videos')

    const results = await Promise.all(
      videos.slice(0, 5).map(async (video) => {
        try {
          const transcript = await getTranscript(video.id)
          console.log('TRANSCRIPT for', video.title, ':', transcript ? 'GOT IT' : 'NULL')
          const analysis = await analyzeIllustration(video, transcript, query)
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
        } catch (e) {
          console.log('FAILED VIDEO:', video.title, e.message)
          return null
        }
      })
    )

    const final = results.filter(Boolean)
    console.log('FINAL RESULTS COUNT:', final.length)
    res.json({ results: final })
  } catch (err) {
    console.error('HANDLER ERROR:', err.message)
    res.status(500).json({ error: err.message || 'Search failed' })
  }
}
