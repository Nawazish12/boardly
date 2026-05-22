export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

export function notFound(message = "Resource not found") {
  return new ApiError(404, message);
}

export function badRequest(message = "Bad request", errors = []) {
  return new ApiError(400, message, errors);
}

export function unauthorized(message = "Unauthorized") {
  return new ApiError(401, message);
}

export function forbidden(message = "Forbidden") {
  return new ApiError(403, message);
}

export function conflict(message = "Conflict") {
  return new ApiError(409, message);
}
