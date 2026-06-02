// Base application error with status code and code
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Error for 400 Bad Request responses
export class BadRequestError extends AppError {
  constructor(code: string, message: string, details?: any) {
    super(400, code, message, details);
  }
}

// Error for 401 Unauthorized responses
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

// Error for 403 Forbidden responses
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

// Error for 404 Not Found responses
export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

// Error for 503 Service Unavailable responses
export class ServiceUnavailableError extends AppError {
  constructor(code: string, message: string, details?: any) {
    super(503, code, message, details);
  }
}
