import 'dotenv/config'

export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME,
  APP_HOST: process.env.APP_HOST,
  APP_PORT: process.env.APP_PORT,
  AUTHOR: process.env.AUTHOR,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,
  PAYOS_CLIENT_ID: process.env.YOUR_CLIENT_ID,
  PAYOS_API_KEY: process.env.YOUR_API_KEY,
  PAYOS_CHECKSUM_KEY: process.env.YOUR_CHECKSUM_KEY,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  IS_SERCURE_COOKIE: process.env.IS_SERCURE_COOKIE === 'true'
}