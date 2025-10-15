import express from 'express'
import { env } from '~/config/environment'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
import { connectDB } from '~/config/database'

// router
import authRoutes from '~/routes/authRoutes'

// admin
import adminRoutes from './routes/adminRoutes'

// pt
import ptPackageRoutes from './routes/ptPackageRoutes'
import ptProfileRoutes from './routes/ptProfileRoutes'

import sessionRoutes from './routes/sessionRoutes'
import ptStudentRoutes from './routes/ptStudentRoutes'

// student
import studentCheckoutRoutes from './routes/studentCheckoutRoutes'

import cookieParser from 'cookie-parser'
import cors from 'cors'
const morgan = require('morgan')
import http from 'http'


const START_SERVER = () => {
  const app = express()

  app.use(express.json())
  app.use(morgan('dev'))
  app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true
  }))
  app.use(cookieParser())

  // user router
  app.use('/api/auth', authRoutes)
  app.use('/api/admin', adminRoutes )
  app.use('/api/pt', ptPackageRoutes )
  app.use('/api/pt', ptProfileRoutes )
  app.use('/api/student', studentCheckoutRoutes)
  app.use('/api/sessions', sessionRoutes)
  app.use('/api/pt', ptStudentRoutes)

  app.use(errorHandlingMiddleware)

  const server = http.createServer(app)

  server.listen(env.APP_PORT, env.APP_HOST, () => {
    console.log(`Hello ${env.AUTHOR}, I am running at http://${env.APP_HOST}:${env.APP_PORT}/`)
  })
}

(async () => {
  try {
    console.log('1. Connecting to MongoDB Cloud Atlas')
    await connectDB()
    console.log('2. Connected to MongoDB Cloud Atlas')
    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()
