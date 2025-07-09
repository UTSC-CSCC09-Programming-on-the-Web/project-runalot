import { Router } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import express from "express";
import { requireAuth } from "./auth-router.js";
import { User } from "../models/User.js";

dotenv.config(); // Load environment variables from .env file


const stripeRouter = function (io) {

  io.on('connection', (socket) => {
    // The frontend sends `userId`, so we must use `userId` here.
    const { userId } = socket.handshake.query;
    if (!userId) {
      console.error('User ID is missing in socket connection, disconnecting.');
      socket.disconnect();
      return;
    }
    // Join the client to a room named after their user ID.
    socket.join(userId);
    console.log(`User ${userId} connected and joined their socket room.`);

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected.`);
    });
  });

  const router = Router();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Debug endpoint to test authentication
router.get('/debug-auth', (req, res) => {

  res.json({
    session: req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated()
  });
});

router.post('/create-checkout-session', express.json(), requireAuth, async (req, res) => {

  console.log('Creating checkout session with body:', req.body);

  try {
    const { userId, userEmail, userName } = req.body;
    const authenticatedUser = req.user; // User from authentication middleware (OAuth profile)
    
    // Extract user info from OAuth profile
    const profileUserId = userId || authenticatedUser.id;
    const profileEmail = userEmail || 
                        (authenticatedUser.emails && authenticatedUser.emails[0]?.value) || 
                        authenticatedUser.email ||
                        authenticatedUser._json?.email;
    const profileName = userName || 
                       authenticatedUser.displayName || 
                       authenticatedUser.name ||
                       (authenticatedUser._json?.name) ||
                       `${authenticatedUser._json?.given_name || ''} ${authenticatedUser._json?.family_name || ''}`.trim();

    // Validate required fields
    if (!profileEmail) {
      console.error('No email found for user:', authenticatedUser);
      return res.status(400).json({ error: 'User email is required for checkout' });
    }

    if (!process.env.STRIPE_PRICE_ID) {
      console.error('STRIPE_PRICE_ID environment variable is missing');
      return res.status(500).json({ error: 'Server configuration error: Missing price ID' });
    }


    // Create or retrieve customer in Stripe
    let customer;
    try {
      // Try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: profileEmail,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: profileEmail,
          name: profileName || 'Unknown User',
          metadata: {
            userId: profileUserId,
            authProvider: authenticatedUser.provider || 'unknown'
          }
        });
        console.log('Created new customer:', customer.id);
      }
    } catch (customerError) {
      return res.status(500).json({ error: 'Failed to process customer information' });
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      customer: customer.id,
      line_items: [
        {
          // Provide the exact Price ID (for example, price_1234) of the product you want to sell
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      redirect_on_completion: 'never',
      metadata: {
        userId: profileUserId,
        userEmail: profileEmail,
        userName: profileName
      }
    });

    res.send({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
                const session = event.data.object;
                const userId = session.metadata?.userId;

                const findedUser = await User.findOne({
                    where: { userId: String(session.metadata?.userId) }
                });

                if(!findedUser) {
                  const clientPaid = await User.create({
                      userId: String(session.metadata?.userId),
                      email: session.metadata?.userEmail,
                      name: session.metadata?.userName,
                      customerId: session.customer,
                      subscription: true,
                      inRoom: false
                  });
                } else{
                  findedUser.subscription = true;
                  await findedUser.save();
                }

                if (io && userId) {
                  io.to(userId).emit('checkout-completed', {
                    message: 'Your subscription has been activated successfully!',
                    userId: userId
                  });
                  console.log(`Sent 'checkout-completed' event to user: ${userId}`);
                }
                break;

            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                console.log('Subscription deleted:', {
                    subscriptionId: subscription.id,
                    customerId: subscription.customer
                });
                // Here you can update your database to reflect cancelled subscription
                break;

            case 'invoice.payment_failed':
                const invoice = event.data.object;
                console.log('Payment failed for invoice:', {
                    invoiceId: invoice.id,
                    customerId: invoice.customer,
                    subscriptionId: invoice.subscription
                });
                // Here you can handle failed payments (e.g., notify user, retry logic)
                break;

            case 'customer.subscription.created':
                const newSubscription = event.data.object;
                console.log('New subscription created:', {
                    subscriptionId: newSubscription.id,
                    customerId: newSubscription.customer,
                    status: newSubscription.status
                });
                // Here you can update your database with new subscription
                break;
        }
    } catch (error) {
        console.error(`Error processing webhook event ${event.type}:`, error);
    }
});

  return router;
}

export default stripeRouter;
