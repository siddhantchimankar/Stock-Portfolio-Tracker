const dotenv = require('dotenv');
dotenv.config();

const dbURL = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
const port = process.env.PORT || 3000;

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const homeRouter = require('./routes/home');

const app = express();

// Set up mongoose connection
const mongoose = require('mongoose');
mongoose.connect(dbURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Middleware
app.use(morgan('dev')); // HTTP request logger
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.use('/', homeRouter);
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname + '/' });
});
app.use('/profile', indexRouter);
app.use('/auth', authRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});