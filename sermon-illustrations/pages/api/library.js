import { getLibrary, saveToLibrary, removeFromLibrary, updateLibraryTags } from '../../lib/library'

export default function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.json({ illustrations: getLibrary() })
    }

    if (req.method === 'POST') {
      const { illustration } = req.body
      if (!illustration) return res.status(400).json({ error: 'Illustration required' })
      return res.json({ illustrations: saveToLibrary(illustration) })
    }

    if (req.method === 'DELETE') {
      const { videoId } = req.body
      if (!videoId) return res.status(400).json({ error: 'videoId required' })
      return res.json({ illustrations: removeFromLibrary(videoId) })
    }

    if (req.method === 'PATCH') {
      const { videoId, tags } = req.body
      return res.json({ illustrations: updateLibraryTags(videoId, tags) })
    }

    res.status(405).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
