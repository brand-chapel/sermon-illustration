import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'library.json')

function readDB() {
  if (!fs.existsSync(DB_PATH)) return { illustrations: [] }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export function getLibrary() {
  return readDB().illustrations
}

export function saveToLibrary(illustration) {
  const db = readDB()
  const exists = db.illustrations.find(i => i.videoId === illustration.videoId)
  if (exists) return db.illustrations
  db.illustrations.unshift({ ...illustration, savedAt: new Date().toISOString() })
  writeDB(db)
  return db.illustrations
}

export function removeFromLibrary(videoId) {
  const db = readDB()
  db.illustrations = db.illustrations.filter(i => i.videoId !== videoId)
  writeDB(db)
  return db.illustrations
}

export function updateLibraryTags(videoId, tags) {
  const db = readDB()
  const item = db.illustrations.find(i => i.videoId === videoId)
  if (item) item.tags = tags
  writeDB(db)
  return db.illustrations
}
