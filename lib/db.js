import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Required for Node.js runtime (Next.js default)
neonConfig.webSocketConstructor = ws

let pool

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export async function query(text, params) {
  return getPool().query(text, params)
}

export default getPool
