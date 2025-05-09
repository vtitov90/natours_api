const bookingController = require('../../controllers/bookingController');
const Booking = require('../../models/bookingModel');
const AppError = require('../../utils/appError');


jest.mock('../../models/bookingModel');
jest.mock('../../utils/appError');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      (...args) =>
        Promise.resolve(fn(...args)),
  ),
);

describe('CheckIfUserBooking Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockBooking;

  beforeEach(() => {
    jest.clearAllMocks();

    
    mockReq = {
      params: {
        id: 'booking123',
      },
      user: {
        id: 'user123',
        role: 'user', 
      },
    };

    mockRes = {};
    mockNext = jest.fn();

    
    mockBooking = {
      id: 'booking123',
      tour: 'tour123',
      user: {
        id: 'user123',
      },
    };

    
    Booking.findById = jest.fn().mockResolvedValue(mockBooking);

    
    AppError.mockImplementation((message, statusCode) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      return error;
    });
  });

  it('should call next() if user is the owner of the booking', async () => {
    
    mockReq.user.id = 'user123';
    mockBooking.user.id = 'user123';

    
    await bookingController.checkIfUserBooking(mockReq, mockRes, mockNext);

    
    expect(Booking.findById).toHaveBeenCalledWith('booking123');

    
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should call next() if user is an admin', async () => {
    
    mockReq.user.id = 'admin456';
    mockReq.user.role = 'admin';
    mockBooking.user.id = 'user123';

    
    await bookingController.checkIfUserBooking(mockReq, mockRes, mockNext);

    
    expect(Booking.findById).toHaveBeenCalledWith('booking123');

    
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should call next() if user is a lead-guide', async () => {
    
    mockReq.user.id = 'guide456';
    mockReq.user.role = 'lead-guide';
    mockBooking.user.id = 'user123';

    
    await bookingController.checkIfUserBooking(mockReq, mockRes, mockNext);

    
    expect(Booking.findById).toHaveBeenCalledWith('booking123');

    
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should return 403 error if user is not the owner and not admin/lead-guide', async () => {
    
    mockReq.user.id = 'otheruser789';
    mockReq.user.role = 'user';
    mockBooking.user.id = 'user123';

    
    await bookingController.checkIfUserBooking(mockReq, mockRes, mockNext);

    
    expect(Booking.findById).toHaveBeenCalledWith('booking123');

    
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockNext.mock.calls[0][0].message).toBe(
      'You do not have permission to perform this action',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should return 404 error if booking not found', async () => {
    
    Booking.findById.mockResolvedValue(null);

    
    await bookingController.checkIfUserBooking(mockReq, mockRes, mockNext);

    
    expect(Booking.findById).toHaveBeenCalledWith('booking123');

    
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockNext.mock.calls[0][0].message).toBe(
      'No booking found with that ID',
    );
    expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
  });
});
