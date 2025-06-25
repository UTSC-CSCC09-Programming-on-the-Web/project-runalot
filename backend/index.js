const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Your Next.js frontend URL
  credentials: true
}));


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
