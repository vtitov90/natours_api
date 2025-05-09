const { getMyReviews } = require('../../controllers/viewsController');
const Review = require('../../models/reviewModel');
const catchAsync = require('../../utils/catchAsync');

jest.mock('../../models/reviewModel');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      async (...args) =>
        await fn(...args),
  ),
);

describe('getMyReviews Controller', () => {
  let req;
  let res;
  let next;
  let mockSelect;
  let mockPopulate;

  beforeEach(() => {
    req = {
      user: { id: 'user-123' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();

    mockPopulate = {
      populate: jest.fn().mockResolvedValue([]),
    };

    mockSelect = {
      select: jest.fn().mockReturnValue(mockPopulate),
    };

    jest.clearAllMocks();
  });

  test('should render review page with user reviews marked as byMe', async () => {
    const mockReviews = [
      {
        _id: 'review-1',
        createdAt: new Date('2023-01-01'),
        review: 'Great tour!',
        rating: 5,
        tour: { name: 'Tour 1', imageCover: 'cover1.jpg' },
        user: 'user-123',
        toObject: jest.fn().mockReturnValue({
          _id: 'review-1',
          createdAt: new Date('2023-01-01'),
          review: 'Great tour!',
          rating: 5,
          tour: { name: 'Tour 1', imageCover: 'cover1.jpg' },
          user: 'user-123',
        }),
      },
      {
        _id: 'review-2',
        createdAt: new Date('2023-02-01'),
        review: 'Amazing experience!',
        rating: 4,
        tour: { name: 'Tour 2', imageCover: 'cover2.jpg' },
        user: 'user-123',
        toObject: jest.fn().mockReturnValue({
          _id: 'review-2',
          createdAt: new Date('2023-02-01'),
          review: 'Amazing experience!',
          rating: 4,
          tour: { name: 'Tour 2', imageCover: 'cover2.jpg' },
          user: 'user-123',
        }),
      },
    ];

    Review.find.mockReturnValue(mockSelect);
    mockPopulate.populate.mockResolvedValue(mockReviews);

    await getMyReviews(req, res, next);

    expect(Review.find).toHaveBeenCalledWith({ user: 'user-123' });
    expect(mockSelect.select).toHaveBeenCalledWith(
      'createdAt review rating tour user',
    );
    expect(mockPopulate.populate).toHaveBeenCalledWith({
      path: 'tour',
      select: 'name imageCover',
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('review', {
      title: 'My tours',
      reviews: expect.arrayContaining([
        expect.objectContaining({
          _id: 'review-1',
          byMe: true,
        }),
        expect.objectContaining({
          _id: 'review-2',
          byMe: true,
        }),
      ]),
    });

    expect(next).not.toHaveBeenCalled();
  });
});
