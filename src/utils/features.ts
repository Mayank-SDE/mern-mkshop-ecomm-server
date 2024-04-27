import mongoose from 'mongoose';
import { InvalidateCacheProps, OrderItemType } from '../types/types.js';
import { nodeCache } from '../app.js';
import { Product } from '../models/product.js';
import { Order } from '../models/order.js';

export const connectDB = (uri: string) => {
  mongoose
    .connect(uri, {
      dbName: 'Ecommerce_24',
    })
    .then((c) => console.log(`DB connected to ${c.connection.host}`))
    .catch((error) => console.log(error));
};

export const invalidateCache = ({
  product,
  order,
  admin,
  userId,
  orderId,
  productId,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      'latest-products',
      'categories',
      'all-products',
    ];
    if (typeof productId === 'string') {
      productKeys.push(`product-${productId}`);
    }
    if (typeof productId === 'object') {
      productId.forEach((id) => productKeys.push(`product-${id}`));
    }
    nodeCache.del(productKeys);
  }
  if (order) {
    const orderKeys: string[] = [
      'all-orders',
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];

    nodeCache.del(orderKeys);
  }
  if (admin) {
    nodeCache.del([
      'admin-stats',
      'admin-pie-charts',
      'admin-bar-charts',
      'admin-line-charts',
    ]);
  }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
  for (let index = 0; index < orderItems.length; index++) {
    const order = orderItems[index];
    const product = await Product.findById(order.productId);
    if (!product) {
      throw new Error('Product not found');
    }
    product.stock -= order.quantity;
    await product.save();
  }
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  if (lastMonth == 0) {
    return thisMonth * 100;
  }
  const percent = (thisMonth / lastMonth) * 100;
  return Number(percent.toFixed(0));
};

export const getInventories = async ({
  categories,
  productsCount,
}: {
  categories: string[];
  productsCount: number;
}) => {
  const categoriesCountPromise = categories.map((category) => {
    return Product.countDocuments({ category });
  });

  const categoryCount: Record<string, number>[] = [];
  const categoriesCount = await Promise.all(categoriesCountPromise);

  categories.forEach((category, index) => {
    categoryCount.push({
      [category]: Math.round((categoriesCount[index] / productsCount) * 100),
    });
  });

  return categoryCount;
};

export interface MyDocument extends Document {
  createdAt?: Date;
  discount?: number;
  total?: number;
}

type FuncProps = {
  length: number;
  docArr: MyDocument[];
  today: Date;
  property?: 'discount' | 'total';
};
export const getChartData = ({
  length,
  docArr,
  today,
  property,
}: FuncProps) => {
  const data: number[] = new Array(length).fill(0);

  docArr.forEach((i) => {
    const creationDate = i.createdAt!;
    const monthDifference =
      (today.getMonth() - creationDate.getMonth() + 12) % 12;
    if (monthDifference < length) {
      if (property) {
        data[length - monthDifference - 1] += i[property]!;
      } else {
        data[length - monthDifference - 1] += 1;
      }
    }
  });

  return data;
};
