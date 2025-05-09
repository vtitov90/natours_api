const { updateUserData } = require('../../controllers/viewsController');
const User = require('../../models/userModel');
const catchAsync = require('../../utils/catchAsync');

jest.mock('../../models/userModel');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      async (...args) =>
        await fn(...args),
  ),
);

describe('updateUserData Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: { id: 'user-123' },
      body: {
        name: 'Updated Name',
        email: 'updated@example.com',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test('should update user data and render account page', async () => {
    const updatedUser = {
      id: 'user-123',
      name: 'Updated Name',
      email: 'updated@example.com',
      photo: 'user.jpg',
    };

    User.findByIdAndUpdate.mockResolvedValue(updatedUser);

    await updateUserData(req, res, next);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-123',
      {
        name: 'Updated Name',
        email: 'updated@example.com',
      },
      {
        new: true,
        runValidators: true,
      },
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('account', {
      title: 'Your account',
      user: updatedUser,
    });

    expect(next).not.toHaveBeenCalled();
  });
});
