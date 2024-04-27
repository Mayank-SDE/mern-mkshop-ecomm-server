//Middleware to make sure that only admin is allowed.

import { User } from '../models/user.js';
import ErrorHandler from '../utils/utility-class.js';
import { TryCatch } from './error.js';

export const adminOnly = TryCatch(async (request, response, next) => {
  const { id } = request.query;
  if (!id) {
    return next(new ErrorHandler('You are not logged in', 401));
  }

  const user = await User.findById(id);

  if (!user) {
    next(new ErrorHandler('This is not the correct id.', 401));
  }

  if (user?.role !== 'admin') {
    return next(new ErrorHandler('You are not admin', 403));
  }

  next();
});
