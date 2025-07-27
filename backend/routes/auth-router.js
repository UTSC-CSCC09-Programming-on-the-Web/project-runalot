import passport from 'passport';
import express from 'express';
import { Router } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
dotenv.config();

const router = Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// Debug endpoint to test authentication
router.get('/debug', (req, res) => {
  console.log('=== AUTH DEBUG ===');
  console.log('Session:', req.session);
  console.log('User:', req.user);
  console.log('isAuthenticated function exists:', typeof req.isAuthenticated);
  console.log('isAuthenticated result:', req.isAuthenticated ? req.isAuthenticated() : 'function not available');
  res.json({
    session: req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    hasIsAuthenticatedFunction: typeof req.isAuthenticated === 'function'
  });
});

// Authentication routes
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

router.get('/user', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      // Find the database user using the passport user ID
      const dbUser = await User.findOne({ where: { userId: String(req.user.id) } });
      
      if (dbUser) {
        // Return both passport user and database user info
        res.json({ 
          user: {
            ...req.user,
            subscription: dbUser.subscription,
            customerId: dbUser.customerId,
            username: dbUser.username,
            inRoom: dbUser.inRoom
          }
        });
      } else {
        // If database user doesn't exist, return just passport user
        res.json({ user: req.user });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
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
