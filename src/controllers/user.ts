import { NextFunction, Request, Response } from 'express';
import { User } from '../models/user.js';
import { NewUserRequestBody } from '../types/types.js';
import { TryCatch } from '../middlewares/error.js';
import ErrorHandler from '../utils/utility-class.js';

export const newUser = TryCatch(
  async (
    request: Request<{}, {}, NewUserRequestBody>,
    response: Response,
    next: NextFunction
  ) => {
    const { name, photo, dob, gender, email, _id } = request.body;

    let user = await User.findById(_id);

    if (user) {
      return response.status(200).json({
        success: true,
        message: `Welcome, ${user.name}`,
      });
    }

    if (!_id || !name || !email || !gender || !dob || !photo) {
      return next(new ErrorHandler('Please enter all fields', 400));
    }

    user = await User.create({
      name,
      photo,
      dob: new Date(dob),
      gender,
      email,
      _id,
    });

    response.status(201).json({
      success: true,
      message: `Welcome ${user.name}`,
    });
  }
);

export const getAllUsers = TryCatch(async (request, response, next) => {
  const users = await User.find({});

  return response.status(200).json({
    success: true,
    users,
  });
});

export const getUser = TryCatch(async (request, response, next) => {
  const id = request.params.id;

  const user = await User.findById(id);

  if (!user) {
    return next(new ErrorHandler('Invalid id', 400));
  }

  return response.status(200).json({
    success: true,
    user,
  });
});

export const deleteUser = TryCatch(async (request, response, next) => {
  const id = request.params.id;

  const user = await User.findById(id);

  if (!user) {
    return next(new ErrorHandler('Invalid id', 400));
  }

  await user.deleteOne();

  return response.status(200).json({
    success: true,
    message: 'User deleted Successfully.',
  });
});
