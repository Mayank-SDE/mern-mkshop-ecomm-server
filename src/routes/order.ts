import express from 'express';
import {
  allOrders,
  deleteOrder,
  getSingleOrder,
  myOrders,
  newOrder,
  processOrder,
} from '../controllers/order.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

// route  -  /api/v1/order/new  - To place the order in the cart.
app.post('/new', newOrder);

// route  -  /api/v1/order/my -  to get the orders in my cart.
app.get('/my', myOrders);

// route  -  /api/v1/order/all -  to get the orders in my cart.
app.get('/all', adminOnly, allOrders);

app
  .route('/:id')
  .get(getSingleOrder)
  .put(adminOnly, processOrder)
  .delete(adminOnly, deleteOrder);

export default app;
