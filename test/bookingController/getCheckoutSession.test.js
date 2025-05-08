// Setup mock functions and objects first
const mockSessionCreate = jest.fn();
const mockStripe = {
  checkout: {
    sessions: {
      create: mockSessionCreate,
    },
  },
};

// Mock modules BEFORE requiring the controller
jest.mock('stripe', () => {
  return jest.fn().mockReturnValue(mockStripe);
});

jest.mock('../../models/tourModel');
jest.mock('../../models/bookingModel');
jest.mock('../../models/userModel');
jest.mock('../../utils/appError');

// Properly mock catchAsync to handle errors
jest.mock('../../utils/catchAsync', () =>
  jest.fn((fn) => {
    return (...args) => {
      try {
        const result = fn(...args);
        // If the function returns a promise, catch any errors
        if (result && typeof result.catch === 'function') {
          return result.catch((error) => {
            // Pass errors to next
            args[2](error);
          });
        }
        return result;
      } catch (error) {
        // Pass synchronous errors to next
        args[2](error);
      }
    };
  }),
);

// Now require the controller AFTER mocks are set up
const bookingController = require('../../controllers/bookingController');
const Tour = require('../../models/tourModel');
const Booking = require('../../models/bookingModel');
const AppError = require('../../utils/appError');

describe('GetCheckoutSession Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockTour;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    // Standard mock objects for tests
    mockReq = {
      params: {
        tourId: 'tour123',
      },
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
      protocol: 'https',
      get: jest.fn().mockReturnValue('natours.com'),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Tour data setup
    mockTour = {
      id: 'tour123',
      name: 'Test Tour',
      slug: 'test-tour',
      summary: 'Amazing test tour',
      price: 499,
      imageCover: 'test-image.jpg',
    };

    // Stripe session setup
    mockSession = {
      id: 'session123',
      payment_status: 'unpaid',
    };

    // Setup the Stripe mock to return the mockSession for this test run
    mockSessionCreate.mockResolvedValue(mockSession);

    // Setup model mocks
    Tour.findById = jest.fn().mockResolvedValue(mockTour);
    Booking.findOne = jest.fn().mockResolvedValue(null);

    // Setup AppError
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    });
  });

  it('should create a checkout session successfully', async () => {
    // Call the tested method
    await bookingController.getCheckoutSession(mockReq, mockRes, mockNext);

    // Check that Tour.findById was called with correct ID
    expect(Tour.findById).toHaveBeenCalledWith('tour123');

    // Check that Booking.findOne was called to verify existing booking
    expect(Booking.findOne).toHaveBeenCalledWith({
      tour: mockTour,
      user: mockReq.user,
    });

    // Check that stripe.checkout.sessions.create was called with correct params
    expect(mockSessionCreate).toHaveBeenCalledWith({
      locale: 'en',
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: 'https://natours.com/my-tours?alert=booking',
      cancel_url: `https://natours.com/tour/${mockTour.slug}`,
      customer_email: 'test@example.com',
      client_reference_id: 'tour123',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${mockTour.name} Tour`,
              description: mockTour.summary,
              images: [`https://natours.com/img/tours/${mockTour.imageCover}`],
            },
            unit_amount: mockTour.price * 100,
          },
        },
      ],
    });

    // Check response
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: 'success',
      session: mockSession,
    });

    // Check that next wasn't called with an error
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return error if user already booked this tour', async () => {
    // Simulate existing booking
    const existingBooking = {
      id: 'booking123',
      tour: mockTour,
      user: mockReq.user,
    };
    Booking.findOne.mockResolvedValue(existingBooking);

    // Call the tested method
    await bookingController.getCheckoutSession(mockReq, mockRes, mockNext);

    // Check that Tour.findById was called
    expect(Tour.findById).toHaveBeenCalledWith('tour123');

    // Check that Booking.findOne was called
    expect(Booking.findOne).toHaveBeenCalledWith({
      tour: mockTour,
      user: mockReq.user,
    });

    // Check that next was called with an error
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockNext.mock.calls[0][0].message).toBe(
      'User has already booked this tour',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(409);

    // Check that stripe.checkout.sessions.create wasn't called
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('should handle error if tour is not found', async () => {
    // Simulate missing tour
    Tour.findById.mockResolvedValue(null);

    // Call the tested method
    await bookingController.getCheckoutSession(mockReq, mockRes, mockNext);

    // Verify next was called with an error
    expect(mockNext).toHaveBeenCalled();
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockNext.mock.calls[0][0].message).toBe('Tour not found');
    expect(mockNext.mock.calls[0][0].statusCode).toBe(404);

    // Check that Tour.findById was called
    expect(Tour.findById).toHaveBeenCalledWith('tour123');

    // Check that stripe.checkout.sessions.create wasn't called
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('should handle Stripe API errors', async () => {
    // Setup normal tour and booking findings
    Tour.findById.mockResolvedValue(mockTour);
    Booking.findOne.mockResolvedValue(null);

    // Setup stripe error
    const stripeError = new Error('Stripe API Error');
    mockSessionCreate.mockRejectedValue(stripeError);

    // Call the tested method
    await bookingController.getCheckoutSession(mockReq, mockRes, mockNext);

    // Verify that next was called with the error
    expect(mockNext).toHaveBeenCalled();
    expect(mockNext.mock.calls[0][0]).toBe(stripeError);

    // Check that stripe.checkout.sessions.create was attempted
    expect(mockSessionCreate).toHaveBeenCalled();

    // Check that response wasn't sent
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
