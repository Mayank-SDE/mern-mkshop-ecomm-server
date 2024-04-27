import { NextFunction, Request, Response } from 'express';
import ErrorHandler from '../utils/utility-class.js';
import { ControllerType, NewUserRequestBody } from '../types/types.js';

export const errorMiddleware = (
  error: ErrorHandler,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  error.message ||= 'Internal server error';
  error.statusCode ||= 500;
  if (error.name === 'CastError') {
    error.message = 'Invalid ID';
  }
  return response.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
};

export const TryCatch = (func: ControllerType) => {
  return (request: Request, response: Response, next: NextFunction) => {
    return Promise.resolve(func(request, response, next)).catch((error) =>
      next(error)
    );
  };
};

const a = TryCatch(
  async (
    request: Request<{}, {}, NewUserRequestBody>,
    response: Response,
    next: NextFunction
  ) => {}
);

console.log(a);
