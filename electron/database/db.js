import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { initTables, seedData } from './schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db = null
let SQL = null
let dbFilePath = null

export async function initDatabase(app) {
  SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file)
  })

  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath, 'data')
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  dbFilePath = path.join(dbDir, 'health_center.db')
  
  if (fs.existsSync(dbFilePath)) {
    const buffer = fs.readFileSync(dbFilePath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  
  initTables(db)
  seedData(db)
  saveDatabase()
  
  return db
}

export function saveDatabase() {
  if (db && dbFilePath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbFilePath, buffer)
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function execQuery(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  
  const stmt = db.prepare(sql)
  stmt.bind(params)
  
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  
  return results
}

export function execRun(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  
  const stmt = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  stmt.free()
  
  saveDatabase()
  
  return {
    changes: db.getRowsModified(),
    lastInsertRowid: db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0]
  }
}

export function execGet(sql, params = []) {
  const results = execQuery(sql, params)
  return results[0] || null
}

export function execAll(sql, params = []) {
  return execQuery(sql, params)
}
