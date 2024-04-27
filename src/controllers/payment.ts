import { stripe } from '../app.js';
import { TryCatch } from '../middlewares/error.js';
import { Coupon } from '../models/coupon.js';
import ErrorHandler from '../utils/utility-class.js';

export const createPaymentIntent = TryCatch(async (request, response, next) => {
  const { amount } = request.body;
  console.log(amount);
  if (!amount) {
    return next(new ErrorHandler('Please enter amount.', 400));
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: 'inr',
  });

  return response.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});

export const newCoupon = TryCatch(async (request, response, next) => {
  const { coupon, amount } = request.body;

  if (!coupon || !amount) {
    return next(new ErrorHandler('Please enter both coupon and amount.', 400));
  }

  await Coupon.create({
    coupon,
    amount,
  });

  return response.status(201).json({
    success: true,
    message: `Coupon ${coupon} created Successfully.`,
  });
});

export const applyDiscount = TryCatch(async (request, response, next) => {
  const { coupon } = request.query;
  const code = coupon as string;

  const discount = await Coupon.findOne({ coupon: code });

  if (!discount) {
    return next(new ErrorHandler('Invalid coupon code', 400));
  }

  return response.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

export const allCoupons = TryCatch(async (request, response, next) => {
  const coupons = await Coupon.find({});
  return response.status(200).json({
    success: true,
    coupons,
  });
});

export const deleteCoupon = TryCatch(async (request, response, next) => {
  const { id } = request.params;
  console.log(id);
  const coupon = await Coupon.findByIdAndDelete(id);

  if (!coupon) {
    return next(new ErrorHandler('Invalid coupon id', 400));
  }

  return response.status(200).json({
    success: true,
    message: `Coupons ${coupon?.coupon} deleted successfully.`,
  });
});
