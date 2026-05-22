import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(_req, _res, next) {
  next(new ApiError(404, "Route not found"));
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err instanceof ApiError || err.isOperational;

  const response = {
    success: false,
    message: isOperational ? err.message : "Internal server error",
  };

  if (err.errors?.length) {
    response.errors = err.errors;
  }

  if (process.env.NODE_ENV !== "production" && !isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
