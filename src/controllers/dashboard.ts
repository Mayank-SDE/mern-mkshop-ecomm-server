import { nodeCache } from '../app.js';
import { TryCatch } from '../middlewares/error.js';
import { Order } from '../models/order.js';
import { Product } from '../models/product.js';
import { User } from '../models/user.js';
import {
  MyDocument,
  calculatePercentage,
  getChartData,
  getInventories,
} from '../utils/features.js';

export const getDashboardStats = TryCatch(async (request, response, next) => {
  const key = 'admin-stats';
  let stats = {};
  if (nodeCache.has(key)) {
    stats = JSON.parse(nodeCache.get(key) as string);
  } else {
    const today = new Date();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };

    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthProductsPromise = Product.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthProductsPromise = Product.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthUsersPromise = User.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthUsersPromise = User.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });

    const lastMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const lastSixMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    });

    const latestTransactionPromise = Order.find({})
      .select(['orderItems', 'discount', 'total', 'status'])
      .limit(4);

    const [
      thisMonthProducts,
      thisMonthUsers,
      thisMonthOrders,
      lastMonthProducts,
      lastMonthUsers,
      lastMonthOrders,
      productsCount,
      usersCount,
      allOrders,
      lastSixMonthOrders,
      categories,
      femaleUsersCount,
      latestTransaction,
    ] = await Promise.all([
      thisMonthProductsPromise,
      thisMonthUsersPromise,
      thisMonthOrdersPromise,
      lastMonthProductsPromise,
      lastMonthUsersPromise,
      lastMonthOrdersPromise,
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({}).select('total'),
      lastSixMonthOrdersPromise,
      Product.distinct('category'),
      User.countDocuments({ gender: 'female' }),
      latestTransactionPromise,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce((total, order) => {
      return total + (order.total || 0);
    }, 0);

    const lastMonthRevenue = lastMonthOrders.reduce((total, order) => {
      return total + (order.total || 0);
    }, 0);

    const changePercent = {
      revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
      product: calculatePercentage(
        thisMonthProducts.length,
        lastMonthProducts.length
      ),
      user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
      order: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
    };
    const revenue = allOrders.reduce((total, order) => {
      return total + (order.total || 0);
    }, 0);

    const counts = {
      revenue,
      product: productsCount,
      user: usersCount,
      order: allOrders.length,
    };

    const orderMonthCounts = getChartData({
      length: 6,
      today,
      docArr: lastSixMonthOrders as any[],
    });
    const orderMonthlyRevenue = getChartData({
      length: 6,
      today,
      docArr: lastSixMonthOrders as any[],
      property: 'total',
    });

    const categoryCount = await getInventories({
      categories,
      productsCount,
    });

    const userRatio = {
      male: usersCount - femaleUsersCount,
      female: femaleUsersCount,
    };

    const modifyLatestTransaction = latestTransaction.map((transaction) => {
      return {
        _id: transaction._id,
        discount: transaction.discount,
        amount: transaction.total,
        quantity: transaction.orderItems.length,
        status: transaction.status,
      };
    });

    stats = {
      categoryCount,
      changePercent,
      counts,
      chart: {
        order: orderMonthCounts,
        revenue: orderMonthlyRevenue,
      },
      userRatio,
      latestTransaction: modifyLatestTransaction,
    };
    nodeCache.set(key, JSON.stringify(stats));
  }

  return response.status(200).json({
    success: true,
    stats,
  });
});

export const getPieChart = TryCatch(async (request, response, next) => {
  const key = 'admin-pie-charts';

  let charts;

  if (nodeCache.has(key)) {
    charts = JSON.parse(nodeCache.get(key) as string);
  } else {
    const allOrderPromise = Order.find({}).select([
      'total',
      'discount',
      'subtotal',
      'tax',
      'shippingCharges',
    ]);
    const [
      processingOrder,
      shippedOrder,
      deliveredOrder,
      categories,
      productsCount,
      outOfStock,
      allOrders,
      allUsers,
      adminUsers,
      customerUsers,
    ] = await Promise.all([
      Order.countDocuments({ status: 'Processing' }),
      Order.countDocuments({ status: 'Shipped' }),
      Order.countDocuments({ status: 'Delivered' }),
      Product.distinct('category'),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      allOrderPromise,
      User.find({}).select('dob'),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' }),
    ]);

    const grossIncome = allOrders.reduce((prev, order) => {
      return prev + (order.total || 0);
    }, 0);

    const discount = allOrders.reduce((prev, order) => {
      return prev + (order.discount || 0);
    }, 0);

    const productionCost = allOrders.reduce((prev, order) => {
      return prev + (order.shippingCharges || 0);
    }, 0);

    const burnt = allOrders.reduce((prev, order) => {
      return prev + (order.tax || 0);
    }, 0);

    const marketingCost = Math.round(grossIncome * (30 / 100));

    const netMargin =
      grossIncome - discount - productionCost - burnt - marketingCost;

    const revenueDistribution = {
      netMargin,
      discount,
      productionCost,
      burnt,
      marketingCost,
    };
    const orderFullfillment = {
      processing: processingOrder,
      shipped: shippedOrder,
      delivered: deliveredOrder,
    };

    const productsCategories = await getInventories({
      categories,
      productsCount,
    });

    const stockAvailability = {
      inStock: productsCount - outOfStock,
      outOfStock: outOfStock,
    };

    const adminCustomer = {
      admin: adminUsers,
      customer: customerUsers,
    };

    const usersAgeGroup = {
      teen: allUsers.filter((user) => user.age < 20).length,
      adult: allUsers.filter((user) => 20 <= user.age && user.age <= 40).length,
      old: allUsers.filter((user) => user.age >= 40).length,
    };

    charts = {
      orderFullfillment,
      productsCategories,
      stockAvailability,
      revenueDistribution,
      adminCustomer,
      usersAgeGroup,
    };
    nodeCache.set(key, JSON.stringify(charts));
  }
  return response.status(200).json({
    success: true,
    charts,
  });
});

export const getBarChart = TryCatch(async (request, response, next) => {
  let charts;
  const key = 'admin-bar-charts';
  if (nodeCache.has(key)) {
    charts = JSON.parse(nodeCache.get(key) as string);
  } else {
    const today = new Date();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const twelveMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    }).select('createdAt');
    const sixMonthProductsPromise = Product.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    }).select('createdAt');

    const sixMonthUsersPromise = User.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    }).select('createdAt');

    const [orders, products, users] = await Promise.all([
      twelveMonthOrdersPromise,
      sixMonthProductsPromise,
      sixMonthUsersPromise,
    ]);

    const productCounts = getChartData({
      length: 6,
      today,
      docArr: products as any[],
    });
    const orderCounts = getChartData({
      length: 12,
      today,
      docArr: orders as any[],
    });
    const userCounts = getChartData({
      length: 6,
      today,
      docArr: users,
    });

    charts = {
      users: userCounts,
      products: productCounts,
      orders: orderCounts,
    };
    nodeCache.set(key, JSON.stringify(charts));
  }
  return response.status(200).json({
    success: true,
    charts,
  });
});

export const getLineChart = TryCatch(async (request, response, next) => {
  let charts;
  const key = 'admin-line-charts';
  if (nodeCache.has(key)) {
    charts = JSON.parse(nodeCache.get(key) as string);
  } else {
    const today = new Date();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const baseQuery = {
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    };

    const [orders, products, users] = await Promise.all([
      Order.find(baseQuery).select(['createdAt', 'discount', 'total']),
      Product.find(baseQuery).select('createdAt'),
      User.find(baseQuery).select('createdAt'),
    ]);

    const productCounts = getChartData({
      length: 12,
      today,
      docArr: products as any[],
    });
    const discount = getChartData({
      length: 12,
      today,
      docArr: orders as any[],
      property: 'discount',
    });
    const userCounts = getChartData({
      length: 12,
      today,
      docArr: users,
    });
    const revenue = getChartData({
      length: 12,
      today,
      docArr: orders as any[],
      property: 'total',
    });
    charts = {
      users: userCounts,
      products: productCounts,
      discount,
      revenue,
    };
    nodeCache.set(key, JSON.stringify(charts));
  }
  return response.status(200).json({
    success: true,
    charts,
  });
});
