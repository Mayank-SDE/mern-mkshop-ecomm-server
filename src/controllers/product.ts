import { Request } from 'express';

import { TryCatch } from '../middlewares/error.js';
import {
  BaseQuery,
  NewProductRequestBody,
  SearchRequestQuery,
} from '../types/types.js';
import { Product } from '../models/product.js';
import ErrorHandler from '../utils/utility-class.js';
import { rm } from 'fs';
import { nodeCache } from '../app.js';
import { invalidateCache } from '../utils/features.js';

export const newProduct = TryCatch(
  async (request: Request<{}, {}, NewProductRequestBody>, response, next) => {
    const { name, price, category, stock } = request.body;

    const photo = request.file;

    if (!photo) {
      return next(new ErrorHandler('Please add photo', 400));
    }

    if (!name || !price || !category || !stock) {
      rm(photo.path, () => {
        console.log('deleted');
      });
      return next(new ErrorHandler('Please enter all fields', 400));
    }
    await Product.create({
      name,
      price,
      category: category.toLowerCase(),
      stock,
      photo: photo.path,
    });
    invalidateCache({
      product: true,
      admin: true,
    });
    return response.status(201).json({
      success: 'true',
      message: 'Product created Successfully.',
    });
  }
);

//Revalidate on New , update or delete or New Order product.
export const getLatestProducts = TryCatch(
  async (request: Request<{}, {}, NewProductRequestBody>, response, next) => {
    let products = [];

    if (nodeCache.has('latest-products')) {
      products = JSON.parse(nodeCache.get('latest-products')!);
    } else {
      products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
      nodeCache.set('latest-products', JSON.stringify(products));
    }

    response.status(200).json({
      success: true,
      products,
    });
  }
);

//Revalidate on New , update or delete or New Order product.
export const getAllCategories = TryCatch(
  async (request: Request<{}, {}, NewProductRequestBody>, response, next) => {
    let categories = [];

    if (nodeCache.has('categories')) {
      categories = JSON.parse(nodeCache.get('categories') as string);
    } else {
      categories = await Product.distinct('category');
      nodeCache.set('categories', JSON.stringify(categories));
    }

    response.status(200).json({
      success: true,
      categories,
    });
  }
);

export const getAdminProducts = TryCatch(
  async (request: Request<{}, {}, NewProductRequestBody>, response, next) => {
    let products = [];

    if (nodeCache.has('all-products')) {
      products = JSON.parse(nodeCache.get('all-products') as string);
    } else {
      products = await Product.find({});
      nodeCache.set('all-products', JSON.stringify(products));
    }

    response.status(200).json({
      success: true,
      products,
    });
  }
);

export const getSingleProduct = TryCatch(async (request, response, next) => {
  const id = request.params.id;
  let product;
  if (nodeCache.has(`product-${id}`)) {
    product = JSON.parse(nodeCache.get(`product-${id}`) as string);
  } else {
    product = await Product.findById(id);
    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }
    nodeCache.set(`product-${id}`, JSON.stringify(product));
  }

  response.status(200).json({
    success: true,
    product,
  });
});

export const updateProduct = TryCatch(async (request, response, next) => {
  const { id } = request.params;
  const { name, price, category, stock } = request.body;

  const photo = request.file;

  const product = await Product.findById(id);
  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }

  if (photo) {
    rm(product.photo!, () => {
      console.log('Old Photo Deleted');
    });
    product.photo = photo.path;
  }

  if (name) {
    product.name = name;
  }
  if (price) {
    product.price = price;
  }
  if (stock) {
    product.stock = stock;
  }
  if (category) {
    product.category = category;
  }
  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });
  await product.save();

  return response.status(200).json({
    success: 'true',
    message: 'Product Updated Successfully.',
  });
});

export const deleteSingleProduct = TryCatch(async (request, response, next) => {
  const id = request.params.id;

  const product = await Product.findById(id);
  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }

  rm(product.photo!, () => {
    console.log('Product photo deleted');
  });

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });
  await product.deleteOne();
  response.status(200).json({
    success: true,
    message: 'Product Deleted Successfully.',
  });
});

export const getAllProducts = TryCatch(
  async (request: Request<{}, {}, {}, SearchRequestQuery>, response, next) => {
    const { search, sort, category, price } = request.query;

    const page = Number(request.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;

    const baseQuery: BaseQuery = {};

    if (search) {
      baseQuery.name = {
        $regex: search,
        $options: 'i',
      };
    }
    if (price) {
      baseQuery.price = {
        $lte: Number(price),
      };
    }

    if (category) {
      baseQuery.category = category;
    }

    const productsPromise = Product.find(baseQuery)
      .sort(sort && { price: sort === 'asc' ? 1 : -1 })
      .limit(limit)
      .skip(skip);

    const [products, filteredOnlyProducts] = await Promise.all([
      productsPromise,
      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(filteredOnlyProducts.length / limit);

    response.status(200).json({
      success: true,
      products,
      totalPage,
    });
  }
);

/*

Generating fake products using the @faker-js/faker

import { faker } from '@faker-js/faker';

const generateRandomProducts = async (count: number = 10) => {
  const products = [];
  for (let i = 0; i < count; i++) {
    const product = {
      name: faker.commerce.productName(),
      photo: 'uploads/f1639e76-164e-451a-98d0-0ecb80d125cf.jpg',
      price: faker.commerce.price({ min: 1500, max: 80000, dec: 0 }),
      stock: faker.commerce.price({ min: 0, max: 100, dec: 0 }),
      category: faker.commerce.department(),
      createdAt: new Date(faker.date.past()),
      updatedAt: new Date(faker.date.recent()),
      __v: 0,
    };
    products.push(product);
  }
  await Product.create(products);
  console.log({
    success: true,
  });
};

// generateRandomProducts(100);
*/
/*

Deleteing all the fake products except two products. 


const deleteRandomProducts = async (count: number = 10) => {
  const products = await Product.find({}).skip(2);
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    await product.deleteOne();
  }
  console.log({
    success: true,
  });
};

// deleteRandomProducts(198);
*/
