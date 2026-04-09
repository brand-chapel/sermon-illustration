import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeIllustration(video, transcript, searchQuery) {
  const context = transcript
    ? `Video transcript:\n${transcript}`
    : `Video title: ${video.title}\nDescription: ${video.description}`

  const prompt = `You are a sermon research assistant helping a pastor find and evaluate sermon illustrations.

A pastor searched for: "${searchQuery}"

Here is a YouTube video to analyze:
Title: ${video.title}
Channel: ${video.channel}
Views: ${video.viewCount.toLocaleString()}
${context}

Analyze this video and determine if it contains a usable sermon illustration. Extract the following as JSON:

{
  "isIllustration": true/false,
  "type": "prop | demo | visual | story | none",
  "theme": "primary theological theme (e.g. grace, faith, sin, redemption, prayer, identity, mission)",
  "passage": "best scripture passage this connects to (e.g. John 3:16) — infer from content if not stated",
  "summary": "2-3 sentences describing exactly what happened on stage and the specific point it drove home",
  "prop": "the object or prop used, or null",
  "keyPoint": "the single sentence takeaway a congregation would remember",
  "impact": 0-100 score based on memorability and emotional resonance,
  "reusability": 0-100 score — can any church recreate this easily?
}

If this is not a sermon illustration (e.g. it's a full sermon, a music video, unrelated content), set isIllustration to false and return minimal data.
Return ONLY valid JSON, no markdown.`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = res.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}
