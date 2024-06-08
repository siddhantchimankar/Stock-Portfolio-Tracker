const router = require('express').Router();
const user = require('../models/user');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const session = require("express-session");
const LocalStrategy = require('passport-local').Strategy


passport.use(
    new LocalStrategy((username, password, done) => {
      user.findOne({ username: username }, async(err, user) => {
        if (err) { 
          return done(err);
        }
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        bcryptjs.compare(password, user.password, (err, res) => {
            if (res) {
              // passwords match! log user in
              return done(null, user)
            } else {
              // passwords do not match!
              return done(null, false, { message: "Incorrect password" })
            }
          })
      });
    })
);

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    user.findById(id, function(err, user) {
        done(err, user);
    });
});

router.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
router.use(passport.initialize());
router.use(passport.session());
  

router.get('/', (req, res) => {
    res.render('auth');
});


router.get('/signup', (req, res) => {
    res.render('signup');
})

router.post("/signup", async(req, res, next) => {

   const hashpass = await bcryptjs.hash(req.body.password, 10);

    var newuser = new user({
        username: req.body.username,
        password: hashpass
    })
    
    newuser.save().then(() => {
        res.redirect('/auth/login');
    })
    //Save in DB
    //console.log('sign up user', newuser);
});

router.get('/login', (req, res) => {
    res.render('login');
})

router.post("/login", passport.authenticate('local', {

	failureRedirect : '/auth/login',
}), (req, res) => {
    res.redirect('/profile/' + req.body.username);
})


module.exports = router;

