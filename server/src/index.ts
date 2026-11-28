import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'

const port = Number(process.env.PORT ?? 4000)
const mongoUri = process.env.MONGODB_URI

async function migrateUserPhoneIndex() {
  const users = mongoose.connection.db?.collection('users')
  if (!users) return

  await users.updateMany({ phone: null }, { $unset: { phone: '' } })

  const indexes = await users.indexes()
  const phoneIndex = indexes.find((index) => index.name === 'phone_1')
  const isPartialStringIndex = phoneIndex?.unique === true
    && phoneIndex.partialFilterExpression?.phone?.$type === 'string'

  if (phoneIndex && !isPartialStringIndex) {
    await users.dropIndex('phone_1')
  }
  if (!phoneIndex || !isPartialStringIndex) {
    await users.createIndex(
      { phone: 1 },
      {
        unique: true,
        partialFilterExpression: { phone: { $type: 'string' } },
      },
    )
  }
}

async function start() {
  if (mongoUri) {
    await mongoose.connect(mongoUri)
    await migrateUserPhoneIndex()
  }

  app.listen(port, () => {
    console.log(`Rozgaar Setu API listening on http://localhost:${port}`)
  })
}

start().catch((error: unknown) => {
  console.error('MongoDB connection failed:', error)
  app.listen(port, () => {
    console.log(`Rozgaar Setu API listening with unavailable database on http://localhost:${port}`)
  })
})