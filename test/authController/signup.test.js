const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const Email = require('../../utils/email');
const authController = require('../../controllers/authController');

// Mock the modules BEFORE requiring the controller
jest.mock('jsonwebtoken');
jest.mock('../../models/userModel');
jest.mock('../../utils/email');
jest.mock('../../utils/catchAsync', () => (fn) => (...args) => {
  try {
    const result = fn(...args);
    if (result.catch) {
      return result.catch((err) => {
        args[2](err); // Pass error to next()
      });
    }
    return result;
  } catch (err) {
    args[2](err); // Pass error to next()
  }
});

describe('Signup Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockUser;
  let mockEmailInstance;
  let originalCreateSendToken;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Save original function if needed
    originalCreateSendToken = authController.createSendToken;

    // Standard mock objects for tests
    mockReq = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        role: 'user',
      },
      protocol: 'https',
      secure: true,
      get: jest.fn().mockReturnValue('natours.com'),
    };

    mockRes = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Setup User mock
    mockUser = {
      _id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      save: jest.fn().mockResolvedValue({}),
    };

    // Setup Email mock
    mockEmailInstance = {
      sendWelcome: jest.fn().mockResolvedValue(true),
    };

    Email.mockImplementation(() => mockEmailInstance);

    // Create mock for User.create
    User.create.mockResolvedValue(mockUser);

    // Setup the JWT sign mock
    jwt.sign.mockImplementation((payload, secret, options) => {
      if (secret === process.env.JWT_SECRET) {
        return 'mock-access-token';
      }
      return 'mock-refresh-token';
    });

    // Save original env variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    process.env.JWT_COOKIE_EXPIRES_IN = '15';
    process.env.REFRESH_COOKIE_EXPIRES_IN = '7';
  });

  afterEach(() => {
    // Restore original function after each test if it was modified
    if (authController.createSendToken !== originalCreateSendToken) {
      authController.createSendToken = originalCreateSendToken;
    }

    // Remove from global scope if added
    if (global.createSendToken) {
      delete global.createSendToken;
    }
  });

  it('should create a new user and send welcome email', async () => {
    // Mock createSendToken function
    const mockCreateSendToken = jest.fn();
    authController.createSendToken = mockCreateSendToken;
    global.createSendToken = mockCreateSendToken;

    // Call the tested method
    await authController.signup(mockReq, mockRes, mockNext);

    // Check that User.create was called with correct data
    expect(User.create).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      passwordChangedAt: undefined,
      role: 'user',
    });

    // Check that Email constructor was called with correct parameters
    expect(Email).toHaveBeenCalledWith(mockUser, 'https://natours.com/me');

    // Check that sendWelcome method was called
    expect(mockEmailInstance.sendWelcome).toHaveBeenCalled();

    // Check createSendToken call with correct parameters
    expect(mockCreateSendToken).toHaveBeenCalledWith(
      mockUser,
      201,
      mockReq,
      mockRes,
    );
  });

  it('should handle errors during user creation', async () => {
    // Mock createSendToken to prevent errors from actual implementation
    const mockCreateSendToken = jest.fn();
    authController.createSendToken = mockCreateSendToken;
    global.createSendToken = mockCreateSendToken;

    // Simulate error during user creation
    const error = new Error('Validation failed');
    User.create.mockRejectedValue(error);

    // Call the tested method
    await authController.signup(mockReq, mockRes, mockNext);

    // Check that next was called with error
    expect(mockNext).toHaveBeenCalledWith(error);

    // Check that Email was not created
    expect(Email).not.toHaveBeenCalled();
  });

  it('should handle errors during email sending', async () => {
    // Mock createSendToken to prevent errors from actual implementation
    const mockCreateSendToken = jest.fn();
    authController.createSendToken = mockCreateSendToken;
    global.createSendToken = mockCreateSendToken;

    // Simulate error during email sending
    const error = new Error('Email sending failed');
    mockEmailInstance.sendWelcome.mockRejectedValue(error);

    // Call the tested method
    await authController.signup(mockReq, mockRes, mockNext);

    // Check that Email constructor was called
    expect(Email).toHaveBeenCalled();

    // Check that sendWelcome was called
    expect(mockEmailInstance.sendWelcome).toHaveBeenCalled();

    // Check that next was called with error
    expect(mockNext).toHaveBeenCalledWith(error);

    // Verify createSendToken was not called due to error
    expect(mockCreateSendToken).not.toHaveBeenCalled();
  });
});
