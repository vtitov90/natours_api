const { getOverview } = require('../../controllers/viewsController');
const Tour = require('../../models/tourModel');
const catchAsync = require('../../utils/catchAsync');


jest.mock('../../models/tourModel');
jest.mock('../../utils/catchAsync', () =>
  jest.fn(
    (fn) =>
      async (...args) =>
        await fn(...args),
  ),
);

describe('getOverview Controller', () => {
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

  test('should render overview page with tours', async () => {
    
    const mockTours = [
      { id: '1', name: 'Tour 1', price: 297 },
      { id: '2', name: 'Tour 2', price: 497 },
    ];

    
    Tour.find.mockResolvedValue(mockTours);

    
    await getOverview(req, res, next);

    
    expect(Tour.find).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('overview', {
      title: 'All tours',
      tours: mockTours,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
