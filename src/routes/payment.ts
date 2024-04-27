import express from 'express';
import {
  allCoupons,
  applyDiscount,
  createPaymentIntent,
  deleteCoupon,
  newCoupon,
} from '../controllers/payment.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

// route - /api/v1/payment/create - to create payment gateway
app.post('/create', createPaymentIntent);

// route - /api/v1/payment/discount - to create new coupon
app.get('/discount', applyDiscount);

// route - /api/v1/payment/coupon/new - to create new coupon
app.post('/coupon/new', adminOnly, newCoupon);

// route - /api/v1/payment/coupon/all - to get all the coupons
app.get('/coupon/all', adminOnly, allCoupons);

// route - /api/v1/payment/coupon/:id - to delte an particular coupon using the id
app.delete('/coupon/:id', adminOnly, deleteCoupon);

export default app;
