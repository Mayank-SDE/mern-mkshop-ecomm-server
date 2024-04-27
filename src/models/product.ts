import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'please enter  name.'],
    },
    photo: {
      type: String,
      required: [true, 'please enter photo.'],
    },
    price: {
      type: Number,
      required: [true, 'please enter price.'],
    },
    stock: {
      type: Number,
      required: [true, 'please enter stock.'],
    },
    category: {
      type: String,
      required: [true, 'please enter product category.'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model('Product', ProductSchema);
