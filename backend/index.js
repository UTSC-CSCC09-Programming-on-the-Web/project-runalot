require('dotenv').config();

const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { router: authRouter, requireAuth } = require('./routes/auth-router');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Your Next.js frontend URL
  credentials: true
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRouter);

// Stripe route
app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    line_items: [
      {
        // Provide the exact Price ID (for example, price_1234) of the product you want to sell
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    redirect_on_completion: 'never'
  });
  
  res.send({clientSecret: session.client_secret});
});

const PORT = 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
