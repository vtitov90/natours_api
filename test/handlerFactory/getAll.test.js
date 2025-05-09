const { getAll } = require('../../controllers/handlerFactory');

jest.mock('../../utils/apiFeatures');

describe('getAll Controller Function', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test('should get all documents', async () => {
    const mockDocs = [
      { id: 'doc1', name: 'Doc 1' },
      { id: 'doc2', name: 'Doc 2' },
    ];

    const APIFeatures = require('../../utils/apiFeatures');
    APIFeatures.mockImplementation(() => {
      return {
        filter: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limitFields: jest.fn().mockReturnThis(),
        paginate: jest.fn().mockReturnThis(),
        query: mockDocs,
      };
    });

    const mockModel = {
      find: jest.fn().mockReturnValue(mockDocs),
    };

    const getAllHandler = getAll(mockModel);
    await getAllHandler(req, res, next);

    expect(mockModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      results: 2,
      data: { data: mockDocs },
    });
  });

  test('should filter by tourId if provided in params', async () => {
    const mockDocs = [{ id: 'review1', tour: 'tour-id' }];

    const APIFeatures = require('../../utils/apiFeatures');
    APIFeatures.mockImplementation(() => {
      return {
        filter: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limitFields: jest.fn().mockReturnThis(),
        paginate: jest.fn().mockReturnThis(),
        query: mockDocs,
      };
    });

    const mockModel = {
      find: jest.fn().mockReturnValue(mockDocs),
    };

    req.params.tourId = 'tour-id';

    const getAllHandler = getAll(mockModel);
    await getAllHandler(req, res, next);

    expect(mockModel.find).toHaveBeenCalledWith({ tour: 'tour-id' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      results: 1,
      data: { data: mockDocs },
    });
  });
});
