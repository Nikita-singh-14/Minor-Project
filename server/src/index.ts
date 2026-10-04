import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'

const port = Number(process.env.PORT ?? 4000)
const mongoUri = process.env.MONGODB_URI

if (mongoUri) {
  mongoose.connect(mongoUri).catch((error: unknown) => {
    console.error('MongoDB connection failed:', error)
  })
}

app.listen(port, () => {
  console.log(`Rozgaar Setu API listening on http://localhost:${port}`)
})