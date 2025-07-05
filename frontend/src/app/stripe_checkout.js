'use client';

import React, { useCallback, useState, useEffect } from "react";
import {loadStripe} from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useAuth } from './contexts/AuthContext';
import dotenv from 'dotenv';

dotenv.config();

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
// This is your test publishable API key - replace with your actual publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

const handleComplete = () => {
  console.log('Checkout completed');
}

const CheckoutForm = () => {
  const [error, setError] = useState(null);
  const { user, loading } = useAuth();
  
  const fetchClientSecret = useCallback(() => {
    if (!user) {
      setError('User not authenticated');
      return Promise.reject(new Error('User not authenticated'));
    }

    // Create a Checkout Session with user ID
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/stripe/create-checkout-session`, {
      method: "POST",
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        userEmail: user.emails?.[0]?.value || user.email, // Handle different auth providers
        userName: user.displayName || user.name || `${user.given_name} ${user.family_name}`,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Client secret received:', data);
        return data.clientSecret;
      })
      .catch((err) => {
        console.error('Error fetching client secret:', err);
        setError(err.message);
        throw err;
      });
  }, [user]);

  const options = {fetchClientSecret};

  if (loading) {
    return (
      <div style={{padding: '20px', textAlign: 'center'}}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{padding: '20px', border: '1px solid orange', borderRadius: '5px'}}>
        <h3>Authentication Required</h3>
        <p>Please log in to proceed with checkout.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="checkout-error" style={{padding: '20px', border: '1px solid red', borderRadius: '5px'}}>
        <h3>Error loading checkout</h3>
        <p>Error: {error}</p>
        <p>Make sure your backend server is running on the correct port and CORS is configured properly.</p>
        <p>Check the browser console for more details.</p>
      </div>
    );
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={options}
        onComplete={handleComplete}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}

export default CheckoutForm;
