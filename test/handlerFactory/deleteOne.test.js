const { deleteOne } = require('../../controllers/handlerFactory');
const User = require('../../models/userModel');
const AppError = require('../../utils/appError');

jest.mock('../../models/userModel');

describe('deleteOne Controller Function', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: 'test-id' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test('should delete document and return status 204 (non-User model)', async () => {
    const mockModel = {
      findByIdAndDelete: jest
        .fn()
        .mockResolvedValue({ id: 'test-id', name: 'Test Doc' }),
    };

    const deleteHandler = deleteOne(mockModel);
    await deleteHandler(req, res, next);

    expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('test-id');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: null });
    expect(next).not.toHaveBeenCalled();
  });

  test('should mark user as inactive instead of deleting (User model)', async () => {
    User.findByIdAndUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'test-id', name: 'Test User' });

    const deleteHandler = deleteOne(User);
    await deleteHandler(req, res, next);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('test-id', {
      active: false,
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: null });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return error if document not found', async () => {
    const mockModel = {
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    };

    const deleteHandler = deleteOne(mockModel);
    await deleteHandler(req, res, next);

    expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('test-id');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(404);
    expect(next.mock.calls[0][0].message).toBe(
      'No document found with that ID',
    );
  });
});
