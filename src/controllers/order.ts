import { Request } from 'express';
import { TryCatch } from '../middlewares/error.js';
import { NewOrderRequestBody } from '../types/types.js';
import { Order } from '../models/order.js';
import { invalidateCache, reduceStock } from '../utils/features.js';
import ErrorHandler from '../utils/utility-class.js';
import { nodeCache } from '../app.js';

export const myOrders = TryCatch(async (request, response, next) => {
  const { id } = request.query;
  const userId = id as string;
  let orders = [];

  const key = `my-orders-${id}`;

  if (nodeCache.has(key)) {
    orders = JSON.parse(nodeCache.get(key) as string);
  } else {
    orders = await Order.find({ user: userId });
    nodeCache.set(key, JSON.stringify(orders));
  }

  return response.status(201).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (request, response, next) => {
  let orders = [];

  const key = 'all-orders';

  if (nodeCache.has(key)) {
    orders = JSON.parse(nodeCache.get(key) as string);
  } else {
    orders = await Order.find().populate('user', 'name');
    nodeCache.set(key, JSON.stringify(orders));
  }

  return response.status(201).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = TryCatch(async (request, response, next) => {
  let order;

  const { id } = request.params;

  const key = `order-${id}`;

  if (nodeCache.has(key)) {
    order = JSON.parse(nodeCache.get(key) as string);
  } else {
    order = await Order.findById(id).populate('user', 'name');
    if (!order) {
      return next(new ErrorHandler('Order not found', 404));
    }
    nodeCache.set(key, JSON.stringify(order));
  }

  return response.status(201).json({
    success: true,
    order,
  });
});

export const newOrder = TryCatch(
  async (request: Request<{}, {}, NewOrderRequestBody>, response, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = request.body;

    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total) {
      return next(new ErrorHandler('Please enter all fields', 400));
    }
    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      total,
    });

    await reduceStock(orderItems);
    invalidateCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems.map((i) => String(i.productId)),
    });

    return response.status(201).json({
      success: true,
      message: 'Order placed successfully.',
    });
  }
);

export const processOrder = TryCatch(async (request, response, next) => {
  const { id } = request.params;
  const orderId = id as string;
  const order = await Order.findById(orderId);
  console.log('Hello');
  if (!order) {
    return next(new ErrorHandler('Order not found', 404));
  }
  switch (order.status) {
    case 'Processing':
      order.status = 'Shipped';
      break;
    case 'Shipped':
      order.status = 'Delivered';
      break;

    default:
      order.status = 'Delivered';
      break;
  }

  await order.save();
  invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return response.status(200).json({
    success: true,
    message: 'Order processed successfully.',
  });
});

export const deleteOrder = TryCatch(async (request, response, next) => {
  const { id } = request.params;

  const order = await Order.findById(id);
  if (!order) {
    return next(new ErrorHandler('Order not found', 404));
  }

  await order.deleteOne();
  invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return response.status(200).json({
    success: true,
    message: 'Order deleted successfully.',
  });
});
