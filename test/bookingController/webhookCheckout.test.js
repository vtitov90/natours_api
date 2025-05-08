
const mockConstructEvent = jest.fn();
const mockStripe = {
  webhooks: {
    constructEvent: mockConstructEvent,
  },
};


jest.mock('stripe', () => {
  return jest.fn(() => mockStripe);
});

jest.mock('../../models/userModel');
jest.mock('../../models/bookingModel');


const bookingController = require('../../controllers/bookingController');
const User = require('../../models/userModel');
const Booking = require('../../models/bookingModel');

describe('WebhookCheckout Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockEvent;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    
    mockReq = {
      body: 'webhook-body',
      headers: {
        'stripe-signature': 'test-signature',
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    mockNext = jest.fn();

    
    mockSession = {
      client_reference_id: 'tour123',
      customer_email: 'test@example.com',
      amount_total: 49900, 
    };

    
    mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: mockSession,
      },
    };

    
    const mockUser = {
      _id: 'user123',
    };

    
    mockConstructEvent.mockReturnValue(mockEvent);

    
    User.findOne = jest.fn().mockResolvedValue(mockUser);

    Booking.create = jest.fn().mockResolvedValue({
      id: 'booking123',
      tour: 'tour123',
      user: 'user123',
      price: 499,
    });
  });

  it('should process checkout.session.completed event successfully', async () => {
    
    bookingController.webhookCheckout(mockReq, mockRes, mockNext);

    
    expect(mockConstructEvent).toHaveBeenCalledWith(
      mockReq.body,
      mockReq.headers['stripe-signature'],
      process.env.WEBHOOK_SECRET,
    );

    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });

    
    await new Promise((resolve) => setTimeout(resolve, 0));

    
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });

    
    expect(Booking.create).toHaveBeenCalled();
  });

  it('should handle non-checkout.session.completed events', () => {
    
    mockEvent.type = 'payment_intent.succeeded';
    mockConstructEvent.mockReturnValue(mockEvent);

    
    bookingController.webhookCheckout(mockReq, mockRes, mockNext);

    
    expect(mockConstructEvent).toHaveBeenCalled();

    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });

    
    expect(User.findOne).not.toHaveBeenCalled();

    
    expect(Booking.create).not.toHaveBeenCalled();
  });

  it('should handle Stripe signature verification errors', () => {
    
    const stripeError = new Error('Invalid signature');
    mockConstructEvent.mockImplementation(() => {
      throw stripeError;
    });

    
    bookingController.webhookCheckout(mockReq, mockRes, mockNext);

    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      `Webhook Error ${stripeError.message}`,
    );

    
    expect(User.findOne).not.toHaveBeenCalled();

    
    expect(Booking.create).not.toHaveBeenCalled();
  });
});
