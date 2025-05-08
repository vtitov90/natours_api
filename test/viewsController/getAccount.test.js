const { getAccount } = require('../../controllers/viewsController');

describe('getAccount Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        photo: 'user.jpg',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    
    jest.clearAllMocks();
  });

  test('should render account page with correct title', () => {
    
    getAccount(req, res);

    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('account', {
      title: 'Your account',
    });
  });

  test('should work without user object in request', () => {
    
    req = {};

    
    getAccount(req, res);

    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('account', {
      title: 'Your account',
    });
  });
});
