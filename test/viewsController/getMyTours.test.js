const { getMyTours } = require('../../controllers/viewsController');
const Booking = require('../../models/bookingModel');
const Tour = require('../../models/tourModel');
const Review = require('../../models/reviewModel');
const catchAsync = require('../../utils/catchAsync');

jest.mock('../../models/bookingModel');
jest.mock('../../models/tourModel');
jest.mock('../../models/reviewModel');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      async (...args) =>
        await fn(...args),
  ),
);

describe('getMyTours Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: { id: 'user-123' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test('should render booking page with user tours', async () => {
    const mockBookings = [
      {
        _id: 'booking-1',
        tour: 'tour-1',
        price: 297,
        createdAt: new Date('2023-01-01'),
        paid: true,
        user: 'user-123',
      },
      {
        _id: 'booking-2',
        tour: { _id: 'tour-2' },
        price: 497,
        createdAt: new Date('2023-02-01'),
        paid: true,
        user: 'user-123',
      },
    ];

    const mockTours = [
      {
        _id: 'tour-1',
        name: 'Tour 1',
        price: 300,
        toObject: jest.fn().mockReturnValue({
          _id: 'tour-1',
          name: 'Tour 1',
          price: 300,
        }),
      },
      {
        _id: 'tour-2',
        name: 'Tour 2',
        price: 500,
        toObject: jest.fn().mockReturnValue({
          _id: 'tour-2',
          name: 'Tour 2',
          price: 500,
        }),
      },
    ];

    const mockReviews = [
      {
        _id: 'review-1',
        tour: 'tour-1',
        user: 'user-123',
        rating: 5,
        review: 'Great tour!',
      },
    ];

    Booking.find.mockResolvedValue(mockBookings);
    Tour.find.mockResolvedValue(mockTours);
    Review.find.mockResolvedValue(mockReviews);

    await getMyTours(req, res, next);

    expect(Booking.find).toHaveBeenCalledWith({ user: 'user-123' });
    expect(Tour.find).toHaveBeenCalledWith({
      _id: { $in: ['tour-1', { _id: 'tour-2' }] },
    });
    expect(Review.find).toHaveBeenCalledWith({ user: 'user-123' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('booking', {
      title: 'My Tours',
      tours: expect.arrayContaining([
        expect.objectContaining({
          _id: 'tour-1',
          hasReview: true,
          reviewId: 'review-1',
          bookingId: 'booking-1',
          price: 297,
          paid: true,
          isMyBooking: true,
        }),
        expect.objectContaining({
          _id: 'tour-2',
          hasReview: false,
          bookingId: 'booking-2',
          price: 497,
          paid: true,
          isMyBooking: true,
        }),
      ]),
    });

    expect(next).not.toHaveBeenCalled();
  });

  test('should handle empty bookings correctly', async () => {
    Booking.find.mockResolvedValue([]);
    Tour.find.mockResolvedValue([]);
    Review.find.mockResolvedValue([]);

    await getMyTours(req, res, next);

    expect(Tour.find).toHaveBeenCalledWith({ _id: { $in: [] } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('booking', {
      title: 'My Tours',
      tours: [],
    });
  });
});
