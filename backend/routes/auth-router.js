const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const router = express.Router();

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_ID,
  clientSecret: process.env.GITHUB_SECRET,
  callbackURL: "http://localhost:4242/auth/github/callback"
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: "http://localhost:4242/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// Authentication routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: 'http://localhost:3000/login?error=github' }),
  (req, res) => {
    res.redirect('http://localhost:3000/dashboard');
  }
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login?error=google' }),
  (req, res) => {
    res.redirect('http://localhost:3000/dashboard');
  }
);

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

module.exports = { router, requireAuth };
