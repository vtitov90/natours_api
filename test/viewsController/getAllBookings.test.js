const { getAllBookings } = require('../../controllers/viewsController');
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

describe('getAllBookings Controller', () => {
  let req;
  let res;
  let next;
  let mockPopulate;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    next = jest.fn();

    mockPopulate = {
      populate: jest.fn().mockResolvedValue([]),
    };

    
    jest.clearAllMocks();
  });

  test('should render booking page with all bookings', async () => {
    
    const mockBookings = [
      {
        _id: 'booking-1',
        tour: 'tour-1',
        price: 297,
        createdAt: new Date('2023-01-01'),
        paid: true,
        user: {
          name: 'User 1',
          email: 'user1@example.com',
          photo: 'user1.jpg',
        },
      },
      {
        _id: 'booking-2',
        tour: { _id: 'tour-2' },
        price: 497,
        createdAt: new Date('2023-02-01'),
        paid: true,
        user: {
          name: 'User 2',
          email: 'user2@example.com',
          photo: 'user2.jpg',
        },
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
        user: 'user-1',
        rating: 5,
        review: 'Great tour!',
      },
    ];

    
    Booking.find.mockReturnValue(mockPopulate);
    mockPopulate.populate.mockResolvedValue(mockBookings);
    Tour.find.mockResolvedValue(mockTours);
    Review.find.mockResolvedValue(mockReviews);

    
    await getAllBookings(req, res, next);

    
    expect(Booking.find).toHaveBeenCalled();
    expect(mockPopulate.populate).toHaveBeenCalledWith(
      'user',
      'name email photo',
    );
    expect(Tour.find).toHaveBeenCalledWith({
      _id: { $in: ['tour-1', 'tour-2'] },
    });
    expect(Review.find).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('booking', {
      title: 'All Tours',
      tours: expect.arrayContaining([
        expect.objectContaining({
          _id: 'tour-1',
          name: 'Tour 1',
          price: 297,
          bookingId: 'booking-1',
          paid: true,
          hasReview: true,
          reviewId: 'review-1',
        }),
        expect.objectContaining({
          _id: 'tour-2',
          name: 'Tour 2',
          price: 497,
          bookingId: 'booking-2',
          paid: true,
          hasReview: false,
        }),
      ]),
    });

    expect(next).not.toHaveBeenCalled();
  });

  test('should handle non-existent tours correctly', async () => {
    
    const mockBookings = [
      {
        _id: 'booking-1',
        tour: 'non-existent-tour',
        price: 297,
        createdAt: new Date('2023-01-01'),
        paid: true,
        user: {
          name: 'User 1',
          email: 'user1@example.com',
          photo: 'user1.jpg',
        },
      },
    ];

    
    Booking.find.mockReturnValue(mockPopulate);
    mockPopulate.populate.mockResolvedValue(mockBookings);
    Tour.find.mockResolvedValue([]); 
    Review.find.mockResolvedValue([]);

    
    await getAllBookings(req, res, next);

    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('booking', {
      title: 'All Tours',
      tours: [], 
    });
  });
});
