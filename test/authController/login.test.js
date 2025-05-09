const jwt = require('jsonwebtoken');
const authController = require('../../controllers/authController');
const User = require('../../models/userModel');
const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');

jest.mock('jsonwebtoken');
jest.mock('../../models/userModel');
jest.mock('../../utils/appError');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      (...args) =>
        Promise.resolve(fn(...args)),
  ),
);

describe('Login Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
      protocol: 'https',
      secure: true,
      get: jest.fn().mockReturnValue('natours.com'),
    };

    mockRes = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockNext = jest.fn();

    mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      password: 'hashedPassword',
      correctPassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue({}),
    };

    jwt.sign.mockImplementation((payload, secret, options) => {
      if (secret === process.env.JWT_SECRET) {
        return 'mock-access-token';
      } else {
        return 'mock-refresh-token';
      }
    });

    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    process.env.JWT_COOKIE_EXPIRES_IN = '15';
    process.env.REFRESH_COOKIE_EXPIRES_IN = '7';
  });

  it('should login user and send tokens', async () => {
    const originalCreateSendToken = authController.createSendToken;

    const mockCreateSendToken = jest.fn(async (user, statusCode, req, res) => {
      const accessToken = 'mock-access-token';
      const refreshToken = 'mock-refresh-token';

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      res.cookie('jwt', accessToken, {
        maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 60 * 1000,
        httpOnly: true,
        secure: req.secure || req.get('x-forwarded-proto') === 'https',
      });

      res.cookie('refresh', refreshToken, {
        maxAge: process.env.REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: req.secure || req.get('x-forwarded-proto') === 'https',
      });

      user.password = undefined;

      res.status(statusCode).json({
        status: 'success',
        accessToken,
        data: {
          user,
        },
      });
    });

    authController.createSendToken = mockCreateSendToken;
    global.createSendToken = mockCreateSendToken;

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    await authController.login(mockReq, mockRes, mockNext);

    authController.createSendToken = originalCreateSendToken;
    delete global.createSendToken;

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(mockUser.correctPassword).toHaveBeenCalledWith(
      'password123',
      'hashedPassword',
    );

    expect(mockCreateSendToken).toHaveBeenCalledWith(
      mockUser,
      200,
      mockReq,
      mockRes,
    );

    expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    expect(mockRes.cookie).toHaveBeenNthCalledWith(
      1,
      'jwt',
      'mock-access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
      }),
    );
    expect(mockRes.cookie).toHaveBeenNthCalledWith(
      2,
      'refresh',
      'mock-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
      }),
    );

    expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      accessToken: 'mock-access-token',
      data: {
        user: expect.objectContaining({
          _id: 'user123',
          email: 'test@example.com',
          password: undefined,
        }),
      },
    });

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 400 error if email is not provided', async () => {
    mockReq.body = { password: 'password123' };

    const mockAppError = new Error('Please provide email and password');
    mockAppError.statusCode = 400;
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });

    await authController.login(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0].message).toBe(
      'Please provide email and password',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
  });

  it('should return 400 error if password is not provided', async () => {
    mockReq.body = { email: 'test@example.com' };

    const mockAppError = new Error('Please provide email and password');
    mockAppError.statusCode = 400;
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });

    await authController.login(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0].message).toBe(
      'Please provide email and password',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
  });

  it('should return 401 error if user is not found', async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const mockAppError = new Error('Incorrect email or password');
    mockAppError.statusCode = 401;
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });

    await authController.login(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0].message).toBe(
      'Incorrect email or password',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });

  it('should return 401 error if password is incorrect', async () => {
    mockUser.correctPassword = jest.fn().mockResolvedValue(false);

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      error.isOperational = true;
      return error;
    });

    await authController.login(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    const errorPassedToNext = mockNext.mock.calls[0][0];
    expect(errorPassedToNext instanceof Error).toBe(true);
    expect(errorPassedToNext.message).toBe('Incorrect email or password');
    expect(errorPassedToNext.statusCode).toBe(401);
  });
});
