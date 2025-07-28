'use client';

import React, { useCallback, useState, useEffect } from "react";
import { io } from 'socket.io-client';
import {loadStripe} from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';
import dotenv from 'dotenv';
import { useRouter } from 'next/navigation';

dotenv.config();

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
// This is your test publishable API key - replace with your actual publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);


// We will handle redirect via socket event, not just Stripe UI


const CheckoutForm = () => {
  const [error, setError] = useState(null);
  const { user, loading, makeAuthenticatedRequest } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/stripe`, {
      query: { userId: user.id },
      transports: ['websocket'],
      withCredentials: true
    });

    socket.on('checkout-completed', (data) => {
      // router.push('/play');
      socket.disconnect();
    });

    socket.on('connect', () => {
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, [user, router]);
 
  const fetchClientSecret = useCallback(() => {
    if (!user) {
      setError('User not authenticated');
      return Promise.reject(new Error('User not authenticated'));
    }

    if (!makeAuthenticatedRequest) {
      setError('CSRF protection not available');
      return Promise.reject(new Error('CSRF protection not available'));
    }

    // Create a Checkout Session with user ID using CSRF protection
    return makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_BACKEND_URL}/stripe/create-checkout-session`, {
      method: "POST",
      body: JSON.stringify({
        userId: user.id,
        userEmail: user.emails?.[0]?.value || user.email,
        userName: `${user.name.givenName} ${user.name.familyName}`,
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
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}

export default CheckoutForm;
