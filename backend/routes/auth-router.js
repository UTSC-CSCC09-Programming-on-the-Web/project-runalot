import passport from 'passport';
import express from 'express';
import { Router } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


// Authentication routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=github` }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/`);
  }
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google` }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/`);
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
 
export { router as authRouter, requireAuth };
