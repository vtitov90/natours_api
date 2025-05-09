const { getAllReviews } = require('../../controllers/viewsController');
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

describe('getAllReviews Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test('should render review page with organized reviews', async () => {
    const mockReviews = [
      {
        _id: 'review-1',
        createdAt: new Date('2023-01-01'),
        review: 'Great tour!',
        rating: 5,
        tour: { name: 'Tour 1', imageCover: 'cover1.jpg' },
        user: { name: 'User 1', photo: 'user1.jpg' },
      },
      {
        _id: 'review-2',
        createdAt: new Date('2023-02-01'),
        review: 'Amazing experience!',
        rating: 4,
        tour: { name: 'Tour 2', imageCover: 'cover2.jpg' },
        user: { name: 'User 1', photo: 'user1.jpg' },
      },
      {
        _id: 'review-3',
        createdAt: new Date('2023-03-01'),
        review: 'Loved it!',
        rating: 5,
        tour: { name: 'Tour 3', imageCover: 'cover3.jpg' },
        user: { name: 'User 2', photo: 'user2.jpg' },
      },
    ];

    const mockFind = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockPopulate = jest.fn().mockReturnThis();
    const mockSort = jest.fn().mockResolvedValue(mockReviews);

    Review.find.mockImplementation(() => ({
      select: mockSelect,
      populate: mockPopulate,
      sort: mockSort,
    }));

    mockSelect.mockImplementation(() => ({
      select: mockSelect,
      populate: mockPopulate,
      sort: mockSort,
    }));

    mockPopulate.mockImplementation(() => ({
      select: mockSelect,
      populate: mockPopulate,
      sort: mockSort,
    }));

    await getAllReviews(req, res, next);

    expect(Review.find).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalledWith(
      'createdAt review rating tour user',
    );
    expect(mockPopulate).toHaveBeenCalledWith({
      path: 'tour',
      select: 'name imageCover',
    });
    expect(mockPopulate).toHaveBeenCalledWith({
      path: 'user',
      select: 'name photo',
    });
    expect(mockSort).toHaveBeenCalledWith({ 'tour.name': 1 });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('review', {
      title: 'All reviews',
      reviews: expect.arrayContaining(mockReviews),
    });

    expect(next).not.toHaveBeenCalled();
  });

  test('should handle reviews with missing user correctly', async () => {
    const mockReviews = [
      {
        _id: 'review-1',
        createdAt: new Date('2023-01-01'),
        review: 'Great tour!',
        rating: 5,
        tour: { name: 'Tour 1', imageCover: 'cover1.jpg' },
        user: null,
      },
    ];

    const mockFind = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockPopulate = jest.fn().mockReturnThis();
    const mockSort = jest.fn().mockResolvedValue(mockReviews);

    Review.find.mockImplementation(() => ({
      select: mockSelect,
      populate: mockPopulate,
      sort: mockSort,
    }));

    mockSelect.mockImplementation(() => ({
      select: mockSelect,
      populate: mockPopulate,
      sort: mockSort,
    }));

    mockPopulate.mockImplementation(() => ({
      select: mockSelect,
      populate: mockPopulate,
      sort: mockSort,
    }));

    await getAllReviews(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('review', {
      title: 'All reviews',
      reviews: expect.arrayContaining(mockReviews),
    });
  });
});
