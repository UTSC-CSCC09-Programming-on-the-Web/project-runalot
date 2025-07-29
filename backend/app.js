
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import express from 'express';
import bodyParser from 'body-parser';
import { sequelize } from './datasource.js';
import cors from 'cors';
import stripeRouter from './routes/stripe_router.js';
import http from 'http';
import { Server } from 'socket.io';
import gameRouter from './routes/game_router.js';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {authRouter} from './routes/auth-router.js';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

const app = express();

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);

// Cookie parser middleware (required for CSRF)
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL, // Your Next.js frontend URL
  credentials: true
}));

// CSRF protection setup
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax'
  }
});

// Initialize Passport BEFORE any routes that need authentication
app.use(passport.initialize());
app.use(passport.session());

// CSRF token endpoint (before CSRF protection middleware)
app.get('/auth/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Add CSRF protection to all routes except auth callbacks and webhooks
app.use((req, res, next) => {
  // Skip CSRF for auth callbacks, webhooks, and socket.io requests
  if (req.path.includes('/auth/google/callback') || 
      req.path.includes('/stripe/webhook') ||
      req.path === '/auth/csrf-token' ||
      req.path.startsWith('/socket.io/')) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Routes (after Passport initialization)
app.use('/auth', authRouter);



// Create HTTP server and Socket.io
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Helper function to apply middleware only during handshake
function onlyForHandshake(middleware) {
  return (req, res, next) => {
    const isHandshake = req._query.sid === undefined;
    if (isHandshake) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

// Share session middleware with Socket.IO
io.engine.use(onlyForHandshake(sessionMiddleware));
io.engine.use(onlyForHandshake(passport.session()));
io.engine.use(
  onlyForHandshake((req, res, next) => {
    if (req.user) {
      next();
    } else {
      res.writeHead(401);
      res.end();
    }
  }),
);

const stripeNs = io.of("/stripe");

app.use('/game', gameRouter(io));

app.use("/stripe", stripeRouter(stripeNs));

try {
  await sequelize.authenticate();
  await sequelize.sync({ alter: { drop: false } });
} catch (error) {
  console.error("Unable to connect to the database:", error);
}


const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));





