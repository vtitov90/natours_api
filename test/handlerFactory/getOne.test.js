const { getOne } = require('../../controllers/handlerFactory');
const AppError = require('../../utils/appError');

jest.mock('../../utils/catchAsync', () => jest.fn((fn) => fn));

describe('getOne Controller Function', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: 'test-id' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test('should get document by ID without populate options', async () => {
    const mockDoc = { id: 'test-id', name: 'Test Doc' };

    const mockModel = {
      findById: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),

        then: jest.fn((resolve) => resolve(mockDoc)),
      }),
    };

    const getOneHandler = getOne(mockModel);
    await getOneHandler(req, res, next);

    expect(mockModel.findById).toHaveBeenCalledWith('test-id');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { data: mockDoc },
    });
  });

  test('should get document by ID with populate options', async () => {
    const mockDoc = { id: 'test-id', name: 'Test Doc', reviews: [] };
    const popOptions = { path: 'reviews' };

    const populateMock = jest.fn().mockReturnValue({
      then: jest.fn((resolve) => resolve(mockDoc)),
    });

    const mockModel = {
      findById: jest.fn().mockReturnValue({
        populate: populateMock,
      }),
    };

    const getOneHandler = getOne(mockModel, popOptions);
    await getOneHandler(req, res, next);

    expect(mockModel.findById).toHaveBeenCalledWith('test-id');
    expect(populateMock).toHaveBeenCalledWith(popOptions);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { data: mockDoc },
    });
  });

  test('should return error if document not found', async () => {
    const mockModel = {
      findById: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(null)),
      }),
    };

    const getOneHandler = getOne(mockModel);
    await getOneHandler(req, res, next);

    expect(mockModel.findById).toHaveBeenCalledWith('test-id');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].message).toBe(
      'No document found with that ID',
    );
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
