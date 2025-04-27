const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

// Configurar mongoose
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

// Esquema para Usuario en DB
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})
let userModel = mongoose.model('user', userSchema);

// Esquema para los ejercicios
const exerciseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
const exerciseModel = mongoose.model('exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Crear un nuevo usuario
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'El nombre de usuario es requerido.' });
  }
  try {
    const newUser = new userModel({ username });
    const savedUser = await newUser.save();
      res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ error: 'No se pudo crear el usuario.' });
  }
})

// Añadir un ejercicio a un usuario
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration } = req.body;
  let date = req.body.date ? new Date(req.body.date) : new Date();
  const userId = req.params._id;
  const durationNum = parseInt(duration);

  if (!description || !duration) {
    return res.status(400).json({ error: 'La descripción y la duración son requeridas.' });
  }
  if (isNaN(durationNum) || durationNum <= 0) {
    return res.status(400).json({ error: 'La duración debe ser un número positivo.' });
  }
  if (isNaN(date.getTime())) {
    date = new Date(); // Si la fecha proporcionada no es válida, usa la fecha actual
  }

  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const newExercise = new exerciseModel({
      userId: userId,
      description: description,
      duration: durationNum,
      date: date
    });
    const savedExercise = await newExercise.save();
    res.json({
      _id: user._id,
      username: user.username,
      date: new Date(savedExercise.date).toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (error) {
      console.error('Error al añadir ejercicio:', error);
      res.status(500).json({ error: 'No se pudo añadir el ejercicio.' });
  }
});

// Obtener la lista de usuarios
app.get('/api/users', async (req, res) => {
  try {
    const users = await userModel.find({});
    res.json(users);
  } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'No se pudieron obtener los usuarios.' });
  }
});

// Obtener el registro de ejercicios de un usuario
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;
  const query = { userId: userId };
  const options = {};

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      query.date = { $gte: fromDate };
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      query.date = { ...query.date, $lte: toDate };
    }
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (!isNaN(limitNum) && limitNum > 0) {
      options.limit = limitNum;
    }
  }

  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const exercises = await exerciseModel.find(query, '-_id -userId -__v', options).sort({ date: 1 });
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (error) {
      console.error('Error al obtener el registro:', error);
      res.status(500).json({ error: 'No se pudo obtener el registro de ejercicios.' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
