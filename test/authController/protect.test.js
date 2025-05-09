const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../../models/userModel');
const authController = require('../../controllers/authController');
const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');


jest.mock('jsonwebtoken');
jest.mock('util', () => {
  const actualUtil = jest.requireActual('util');
  return {
    ...actualUtil,
    promisify: jest.fn(),
  };
});
jest.mock('../../models/userModel');
jest.mock('../../utils/appError');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      (...args) =>
        Promise.resolve(fn(...args)),
  ),
);

describe('Protect Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockUser;
  let jwtVerifyMock;

  beforeEach(() => {
    
    jest.clearAllMocks();

    
    jwtVerifyMock = jest.fn();
    promisify.mockReturnValue(jwtVerifyMock);

    
    mockReq = {
      headers: {},
      cookies: {},
      secure: true,
      get: jest.fn().mockReturnValue('localhost'),
    };

    mockRes = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    };

    mockNext = jest.fn();

    
    mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      refreshToken: 'valid-refresh-token',
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    };

    
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      error.isOperational = true;
      return error;
    });

    
    jwt.sign.mockReturnValue('new-access-token');

    
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_COOKIE_EXPIRES_IN = '15';
  });

  it('should authenticate user with valid JWT from cookie', async () => {
    
    mockReq.cookies = { jwt: 'valid-token' };

    
    jwtVerifyMock.mockResolvedValue({ id: 'user123', iat: Date.now() / 1000 });

    
    User.findById.mockResolvedValue(mockUser);

    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      'valid-token',
      process.env.JWT_SECRET,
    );

    
    expect(User.findById).toHaveBeenCalledWith('user123');

    
    expect(mockReq.user).toBe(mockUser);
    expect(mockRes.locals.user).toBe(mockUser);

    
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should authenticate user with valid JWT from Authorization header', async () => {
    
    mockReq.headers.authorization = 'Bearer valid-token';

    
    jwtVerifyMock.mockResolvedValue({ id: 'user123', iat: Date.now() / 1000 });

    
    User.findById.mockResolvedValue(mockUser);

    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      'valid-token',
      process.env.JWT_SECRET,
    );

    
    expect(User.findById).toHaveBeenCalledWith('user123');

    
    expect(mockReq.user).toBe(mockUser);
    expect(mockRes.locals.user).toBe(mockUser);

    
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should use refresh token to generate new access token when JWT is invalid', async () => {
    
    mockReq.cookies = {
      jwt: 'invalid-token',
      refresh: 'valid-refresh-token',
    };

    
    
    jwtVerifyMock
      .mockRejectedValueOnce(new Error('Invalid token')) 
      .mockResolvedValueOnce({ id: 'user123' }); 

    
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(jwtVerifyMock).toHaveBeenNthCalledWith(
      1,
      'invalid-token',
      process.env.JWT_SECRET,
    );

    expect(jwtVerifyMock).toHaveBeenNthCalledWith(
      2,
      'valid-refresh-token',
      process.env.REFRESH_TOKEN_SECRET,
    );

    
    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(User.findById().select).toHaveBeenCalledWith('+refreshToken');

    
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user123' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'jwt',
      'new-access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
      }),
    );

    
    expect(mockReq.user).toBe(mockUser);
    expect(mockRes.locals.user).toBe(mockUser);

    
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should return 401 error if no token provided', async () => {
    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe('Please log in');
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });

  it('should return 401 error if both tokens are invalid', async () => {
    
    mockReq.cookies = {
      jwt: 'invalid-token',
      refresh: 'invalid-refresh-token',
    };

    
    jwtVerifyMock.mockRejectedValue(new Error('Invalid token'));

    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe(
      'Session expired, please log in again',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });

  it('should return 403 error if refresh token does not match', async () => {
    
    mockReq.cookies = {
      jwt: 'invalid-token',
      refresh: 'valid-refresh-token',
    };

    
    jwtVerifyMock
      .mockRejectedValueOnce(new Error('Invalid token'))
      .mockResolvedValueOnce({ id: 'user123' });

    
    const userWithDifferentRefreshToken = {
      ...mockUser,
      refreshToken: 'different-refresh-token',
    };

    
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(userWithDifferentRefreshToken),
    });

    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe('Invalid refresh token');
    expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should return 401 error if user no longer exists', async () => {
    
    mockReq.cookies = { jwt: 'valid-token' };

    
    jwtVerifyMock.mockResolvedValue({ id: 'user123', iat: Date.now() / 1000 });

    
    User.findById.mockResolvedValue(null);

    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe(
      'The user belonging to this token no longer exists.',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });

  it('should return 401 error if user changed password after token was issued', async () => {
    
    mockReq.cookies = { jwt: 'valid-token' };

    
    const issuedAtTime = Date.now() / 1000 - 3600; 
    jwtVerifyMock.mockResolvedValue({ id: 'user123', iat: issuedAtTime });

    
    mockUser.changedPasswordAfter.mockReturnValue(true);

    
    User.findById.mockResolvedValue(mockUser);

    
    await authController.protect(mockReq, mockRes, mockNext);

    
    expect(mockUser.changedPasswordAfter).toHaveBeenCalledWith(issuedAtTime);

    
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe(
      'User recently changed password! Please log in again.',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });
});
