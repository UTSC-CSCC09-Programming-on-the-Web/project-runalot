import { Router } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import express from "express";
import { requireAuth } from "./auth-router.js";

dotenv.config(); // Load environment variables from .env file


const stripeRouter = Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Debug endpoint to test authentication
stripeRouter.get('/debug-auth', (req, res) => {
  console.log('=== DEBUG AUTH ENDPOINT ===');
  console.log('Session:', req.session);
  console.log('User:', req.user);
  console.log('isAuthenticated:', req.isAuthenticated());
  res.json({
    session: req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated()
  });
});

stripeRouter.post('/create-checkout-session', requireAuth, async (req, res) => {
  console.log('=== DEBUG: Stripe checkout session creation started ===');
  console.log('Request body:', req.body);
  console.log('User object:', req.user);
  console.log('Environment check:', {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasPriceId: !!process.env.STRIPE_PRICE_ID,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7)
  });

  try {
    const { userId, userEmail, userName } = req.body;
    const authenticatedUser = req.user; // User from authentication middleware (OAuth profile)
    
    console.log('=== DEBUG: Extracting user info ===');
    console.log('Raw authenticated user:', JSON.stringify(authenticatedUser, null, 2));
    
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
    
    console.log('Creating checkout session for user:', {
      userId: profileUserId,
      userEmail: profileEmail,
      userName: profileName
    });

    // Validate required fields
    if (!profileEmail) {
      console.error('No email found for user:', authenticatedUser);
      return res.status(400).json({ error: 'User email is required for checkout' });
    }

    if (!process.env.STRIPE_PRICE_ID) {
      console.error('STRIPE_PRICE_ID environment variable is missing');
      return res.status(500).json({ error: 'Server configuration error: Missing price ID' });
    }

    console.log('=== DEBUG: Creating/finding Stripe customer ===');

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
        console.log('Found existing customer:', customer.id);
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
      console.error('Error handling customer:', customerError);
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

    console.log('Checkout session created successfully:', session.id);
    res.send({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

stripeRouter.post('/webhook', (req, res) => {
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
                console.log('Checkout session completed successfully:', {
                    sessionId: session.id,
                    customerId: session.customer,
                    userId: session.metadata?.userId,
                    userEmail: session.metadata?.userEmail,
                    userName: session.metadata?.userName
                });
                // Here you can update your database with the subscription info
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


export default stripeRouter;
