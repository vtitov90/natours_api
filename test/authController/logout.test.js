const authController = require('../../controllers/authController');
const User = require('../../models/userModel');

jest.mock('../../models/userModel');

describe('Logout Controller', () => {
  let mockReq;
  let mockRes;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: {
        id: 'user123',
      },
      cookies: {
        jwt: 'mock-access-token',
        refresh: 'mock-refresh-token',
      },
    };

    mockRes = {
      clearCookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockUser = {
      _id: 'user123',
      refreshToken: 'mock-refresh-token',
      save: jest.fn().mockResolvedValue({}),
    };

    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  it('should clear cookies and reset refresh token', async () => {
    await authController.logout(mockReq, mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
    expect(mockRes.clearCookie).toHaveBeenNthCalledWith(1, 'jwt');
    expect(mockRes.clearCookie).toHaveBeenNthCalledWith(2, 'refresh');

    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(User.findById().select).toHaveBeenCalledWith('+refreshToken');

    expect(mockUser.refreshToken).toBeUndefined();
    expect(mockUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
    });
  });

  it('should handle logout without authenticated user', async () => {
    mockReq.user = undefined;

    await authController.logout(mockReq, mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);

    expect(User.findById).not.toHaveBeenCalled();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
    });
  });

  it('should handle case when user not found', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await authController.logout(mockReq, mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);

    expect(User.findById).toHaveBeenCalledWith('user123');

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
    });
  });

  it('should handle database error gracefully', async () => {
    const dbError = new Error('Database connection error');
    User.findById.mockReturnValue({
      select: jest.fn().mockRejectedValue(dbError),
    });

    await expect(authController.logout(mockReq, mockRes)).rejects.toThrow(
      'Database connection error',
    );

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);

    expect(User.findById).toHaveBeenCalledWith('user123');

    expect(mockUser.save).not.toHaveBeenCalled();

    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
