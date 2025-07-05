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
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {authRouter} from './routes/auth-router.js';

const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));


app.use(cors({
  origin: process.env.FRONTEND_URL, // Your Next.js frontend URL
  credentials: true
}));


app.use("/stripe", stripeRouter);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRouter);


app.use(function (req, res, next) {
  console.log("HTTP request", req.method, req.url, req.body);
  next();
});

// Create HTTP server and Socket.io
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use('/game', gameRouter(io));

try {
  await sequelize.authenticate();
  await sequelize.sync({ alter: { drop: false } });
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}


// app.post('/create-checkout-session', async (req, res) => {
//   const session = await stripe.checkout.sessions.create({
//     ui_mode: 'embedded',
//     line_items: [
//       {
//         // Provide the exact Price ID (for example, price_1234) of the product you want to sell
//         price: process.env.STRIPE_PRICE_ID,
//         quantity: 1,
//       },
//     ],
//     mode: 'subscription',
//     redirect_on_completion: 'never'
//   });
  
//   res.send({clientSecret: session.client_secret});
// });

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
