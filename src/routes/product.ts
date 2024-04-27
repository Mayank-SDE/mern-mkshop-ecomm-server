import express from 'express';
import {
  deleteSingleProduct,
  getAdminProducts,
  getAllCategories,
  getAllProducts,
  getLatestProducts,
  getSingleProduct,
  newProduct,
  updateProduct,
} from '../controllers/product.js';
import { singleUpload } from '../middlewares/multer.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

// route - /api/v1/product/new - To create an new Product
app.post('/new', adminOnly, singleUpload, newProduct);

// route - /api/v1/product/all - To get all products with filter
app.get('/all', getAllProducts);

// route - /api/v1/product/latest - To get latest product sorted by created at and limt to 5
app.get('/latest', getLatestProducts);

// route - /api/v1/product/categories - To get all the unique categories
app.get('/categories', getAllCategories);

// route - /api/v1/product/admin-products - to get all the admin products
app.get('/admin-products', adminOnly, getAdminProducts);

// To get , update and delete the product
app
  .route('/:id')
  .get(getSingleProduct)
  .put(adminOnly, singleUpload, updateProduct)
  .delete(adminOnly, deleteSingleProduct);

export default app;
