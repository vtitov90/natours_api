const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../../models/userModel');
const authController = require('../../controllers/authController');
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
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      (...args) =>
        Promise.resolve(fn(...args)),
  ),
);

describe('IsLoggedIn Middleware', () => {
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

    jwt.sign.mockReturnValue('new-access-token');

    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_COOKIE_EXPIRES_IN = '15';
  });

  it('should set res.locals.user with valid JWT from cookie', async () => {
    mockReq.cookies = { jwt: 'valid-jwt-token' };

    jwtVerifyMock.mockResolvedValue({ id: 'user123', iat: 123456 });

    User.findById.mockResolvedValue(mockUser);

    await authController.isLoggedIn(mockReq, mockRes, mockNext);

    expect(jwtVerifyMock).toHaveBeenCalledWith(
      'valid-jwt-token',
      'test-jwt-secret',
    );
    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(mockRes.locals.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use refresh token if access token is invalid', async () => {
    mockReq.cookies = {
      jwt: 'invalid-token',
      refresh: 'valid-refresh-token',
    };

    jwtVerifyMock.mockRejectedValueOnce(new Error('Access token invalid'));

    jwtVerifyMock.mockResolvedValueOnce({ id: 'user123' });

    jwtVerifyMock.mockResolvedValueOnce({ id: 'user123', iat: 123456 });

    mockUser.refreshToken = 'valid-refresh-token';

    User.findById
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(mockUser),
      })
      .mockResolvedValueOnce(mockUser);

    await authController.isLoggedIn(mockReq, mockRes, mockNext);

    expect(jwtVerifyMock).toHaveBeenCalledTimes(3);

    expect(jwtVerifyMock).toHaveBeenNthCalledWith(
      1,
      'invalid-token',
      'test-jwt-secret',
    );

    expect(jwtVerifyMock).toHaveBeenNthCalledWith(
      2,
      'valid-refresh-token',
      'test-refresh-secret',
    );

    expect(User.findById).toHaveBeenCalledWith('user123');

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user123' },
      'test-jwt-secret',
      { expiresIn: '15m' },
    );

    expect(mockRes.cookie).toHaveBeenCalledWith(
      'jwt',
      'new-access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
      }),
    );

    expect(mockRes.locals.user).toEqual(mockUser);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should not set res.locals.user if refresh token is invalid', async () => {
    mockReq.cookies = {
      jwt: 'invalid-token',
      refresh: 'invalid-refresh-token',
    };

    jwtVerifyMock.mockRejectedValueOnce(new Error('Access token invalid'));
    jwtVerifyMock.mockRejectedValueOnce(new Error('Refresh token invalid'));

    await authController.isLoggedIn(mockReq, mockRes, mockNext);

    expect(mockRes.locals.user).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() when no tokens are present', async () => {
    mockReq.cookies = {};

    await authController.isLoggedIn(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.locals.user).toBeUndefined();
  });

  it('should not set user if password was changed after token issued', async () => {
    mockReq.cookies = { jwt: 'valid-jwt-token' };

    jwtVerifyMock.mockResolvedValue({ id: 'user123', iat: 1000 });

    mockUser.changedPasswordAfter = jest.fn().mockReturnValue(true);

    User.findById.mockResolvedValue(mockUser);

    await authController.isLoggedIn(mockReq, mockRes, mockNext);

    expect(mockRes.locals.user).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
