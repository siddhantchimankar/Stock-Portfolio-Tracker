const dbURL = 'mongodb+srv://sid:1234@cluster0.zhbue.mongodb.net/userdb?retryWrites=true&w=majority';

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var homeRouter = require('./routes/home');


var app = express();

//Set up mongoose connection
var mongoose = require('mongoose');
var mongoDB = dbURL;
mongoose.connect(mongoDB, { useNewUrlParser: true , useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/', homeRouter);
app.get('/', (req, res) => {
    res.sendFile('index.html', {root : __dirname + '/'});
});

app.use('/profile', indexRouter);
app.use('/auth', authRouter);



module.exports = app;
