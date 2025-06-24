'use client';

import React, { useCallback, useState, useEffect } from "react";
import {loadStripe} from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
// This is your test publishable API key - replace with your actual publishable key
const stripePromise = loadStripe("pk_test_51Rcz3hBTl82uMRTfe2NuvfM1gbLkoWUANvSHN5gg6AM9d9XPtAaej0Fj8V0OkwMIuYjWGh1wVokaBwAE8pM0dl1N00PxH3XoWw");

const CheckoutForm = () => {
  const [error, setError] = useState(null);
  
  const fetchClientSecret = useCallback(() => {
    // Create a Checkout Session
    return fetch("http://localhost:4242/create-checkout-session", {
      method: "POST",
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
  }, []);

  const options = {fetchClientSecret};

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

const Return = () => {
  const [status, setStatus] = useState(null);
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const sessionId = urlParams.get('session_id');

    fetch(`/session-status?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status);
        setCustomerEmail(data.customer_email);
      });
  }, []);

//   if (status === 'open') {
//     return (
//       <Navigate to="/checkout" />
//     )
//   }

  if (status === 'complete') {
    return (
      <section id="success">
        <p>
          We appreciate your business! A confirmation email will be sent to {customerEmail}.

          If you have any questions, please email <a href="mailto:orders@example.com">orders@example.com</a>.
        </p>
      </section>
    )
  }

  return null;
}

export default CheckoutForm;
