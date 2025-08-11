const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

// Schemas & Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// POST: Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username })
    const savedUser = await newUser.save()
    res.json({ username: savedUser.username, _id: savedUser._id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET: All users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id')
  res.json(users)
})

// POST: Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body
    const user = await User.findById(req.params._id)
    if (!user) return res.json({ error: 'User not found' })

    const exerciseDate = date ? new Date(date) : new Date()
    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    })

    const savedExercise = await newExercise.save()

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET: Logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query
    const user = await User.findById(req.params._id)
    if (!user) return res.json({ error: 'User not found' })

    let filter = { userId: user._id }
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from)
      if (to) filter.date.$lte = new Date(to)
    }

    let query = Exercise.find(filter).select('-userId -__v')
    if (limit) query = query.limit(parseInt(limit))

    const exercises = await query.exec()

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
