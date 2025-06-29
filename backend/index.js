import express from 'express';
import bodyParser from 'body-parser';
import {sequelize} from './datasource.js';
import cors from 'cors';
import stripeRouter from './routes/stripe_router.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

