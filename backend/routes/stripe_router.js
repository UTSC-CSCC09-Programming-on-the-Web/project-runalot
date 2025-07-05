import { Router } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import express from "express";

dotenv.config(); // Load environment variables from .env file


const stripeRouter = Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


stripeRouter.post('/create-checkout-session', async (req, res) => {
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

  res.send({ clientSecret: session.client_secret });
});

stripeRouter.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log('Received verified event:', event.type);
        res.status(200).send();
    } catch (err) {
        console.error('Webhook verification failed:', err.message);
        res.status(400).send();
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
               console.log('Checkout session completed successfully:', event.data.object.id);
                break;

            case 'customer.subscription.deleted':
                console.log('Subscription deleted :(');
                break;

            case 'invoice.payment_failed':
                console.log('Payment failed for invoice:', event.data.object.id);
                break;
        }
    } catch (error) {
        console.error(`Error processing webhook event ${event.type}:`, error);
    }
});


export default stripeRouter;
