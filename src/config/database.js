import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from './environment.js'

export const connectDB = async () => {
  try {
    if (!env.MONGODB_URI) {
      throw new Error('Missing MONGODB_URI environment variable.')
    }

    if (env.MONGODB_DNS_SERVERS) {
      const servers = env.MONGODB_DNS_SERVERS.split(',')
        .map((server) => server.trim())
        .filter(Boolean)
      if (servers.length) {
        dns.setServers(servers)
      }
    }

    const connectWithUri = async (mongoUri) => {
      console.log('👉 Connecting to MongoDB with URI =', maskMongoUri(mongoUri))
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000
      })
    }

    await connectWithUri(env.MONGODB_URI)
    console.log('✅ MongoDB connected')
  } catch (error) {
    const shouldTryDirect =
      env.MONGODB_URI_DIRECT &&
      env.MONGODB_URI.startsWith('mongodb+srv://') &&
      isSrvLookupError(error)

    if (shouldTryDirect) {
      try {
        console.warn('⚠️ SRV lookup failed, trying direct MongoDB URI...')
        await mongoose.connect(env.MONGODB_URI_DIRECT, {
          serverSelectionTimeoutMS: 10000
        })
        console.log('✅ MongoDB connected (direct)')
        return
      } catch (directError) {
        console.error('❌ MongoDB connection failed:', directError.message)
        process.exit(1)
      }
    }

    console.error('❌ MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

const maskMongoUri = (mongoUri) =>
  mongoUri.replace(/\/\/([^@/]+)@/, '//***:***@')

const isSrvLookupError = (error) =>
  Boolean(error?.message?.includes('querySrv')) ||
  Boolean(error?.message?.includes('ENOTFOUND')) ||
  Boolean(error?.message?.includes('ECONNREFUSED'))
