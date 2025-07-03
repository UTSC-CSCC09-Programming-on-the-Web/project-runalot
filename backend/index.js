
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

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // Your Next.js frontend URL
  credentials: true
}));

app.use("/stripe", stripeRouter);

app.use(function (req, res, next) {
  console.log("HTTP request", req.method, req.url, req.body);
  next();
});

// Create HTTP server and Socket.io
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
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

const PORT = 4242;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
