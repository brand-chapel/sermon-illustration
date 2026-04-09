import axios from 'axios'
import { YoutubeTranscript } from 'youtube-transcript'

const YT_API = 'https://www.googleapis.com/youtube/v3'
const API_KEY = process.env.YOUTUBE_API_KEY

// Build a smart search query from the user's input
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

// Search YouTube for sermon illustration videos
export async function searchYouTube(query, typeFilter = 'all', maxResults = 8) {
  const searchQuery = buildSearchQuery(query, typeFilter)

  const searchRes = await axios.get(`${YT_API}/search`, {
    params: {
      key: API_KEY,
      q: searchQuery,
      part: 'snippet',
      type: 'video',
      maxResults,
      relevanceLanguage: 'en',
      videoDuration: 'short', // under 4 minutes — clips not full sermons
      videoCaption: 'closedCaption', // only videos with captions (needed for transcript)
    },
  })

  const videoIds = searchRes.data.items.map(v => v.id.videoId).join(',')

  // Get full video stats (views, likes, duration)
  const statsRes = await axios.get(`${YT_API}/videos`, {
    params: {
      key: API_KEY,
      id: videoIds,
      part: 'statistics,contentDetails,snippet',
    },
  })

  return statsRes.data.items.map(video => ({
    id: video.id,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    description: video.snippet.description,
    thumbnail: video.snippet.thumbnails.medium.url,
    publishedAt: video.snippet.publishedAt,
    viewCount: parseInt(video.statistics.viewCount || 0),
    likeCount: parseInt(video.statistics.likeCount || 0),
    duration: video.contentDetails.duration,
    url: `https://www.youtube.com/watch?v=${video.id}`,
  }))
}

// Fetch transcript for a video
export async function getTranscript(videoId) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    // Join first ~4000 chars — enough for Claude to analyze without blowing tokens
    const text = transcript.map(t => t.text).join(' ')
    return text.slice(0, 4000)
  } catch {
    return null
  }
}
