const { getTour } = require('../../controllers/viewsController');
const Tour = require('../../models/tourModel');
const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');

jest.mock('../../models/tourModel');
jest.mock('../../utils/appError');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      async (...args) =>
        await fn(...args),
  ),
);

describe('getTour Controller', () => {
  let req;
  let res;
  let next;
  let mockPopulate;

  beforeEach(() => {
    req = {
      params: {
        slug: 'test-tour',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();

    mockPopulate = {
      populate: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  test('should render tour page with correct data', async () => {
    const mockTour = {
      name: 'Test Tour',
      slug: 'test-tour',
      reviews: [],
    };

    Tour.findOne.mockReturnValue(mockPopulate);
    mockPopulate.populate.mockResolvedValue(mockTour);

    await getTour(req, res, next);

    expect(Tour.findOne).toHaveBeenCalledWith({ slug: 'test-tour' });
    expect(mockPopulate.populate).toHaveBeenCalledWith({
      path: 'reviews',
      fields: 'review rating user',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.stringContaining("default-src 'self'"),
    );
    expect(res.render).toHaveBeenCalledWith('tour', {
      title: 'Test Tour Tour',
      tour: mockTour,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next with AppError if tour not found', async () => {
    Tour.findOne.mockReturnValue(mockPopulate);
    mockPopulate.populate.mockResolvedValue(null);

    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });

    await getTour(req, res, next);

    expect(Tour.findOne).toHaveBeenCalledWith({ slug: 'test-tour' });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.render).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe(
      'There is no tour with that name.',
    );
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
