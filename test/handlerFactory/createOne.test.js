const { createOne } = require('../../controllers/handlerFactory');

describe('createOne Controller Function', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: { name: 'Test Name' },
      file: { filename: 'test-image.jpg' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test('should create new document with provided photo', async () => {
    const newDoc = { id: 'new-id', name: 'Test Name', photo: 'test-image.jpg' };
    const mockModel = {
      create: jest.fn().mockResolvedValue(newDoc),
    };

    const createHandler = createOne(mockModel);
    await createHandler(req, res, next);

    expect(mockModel.create).toHaveBeenCalledWith({
      name: 'Test Name',
      photo: 'test-image.jpg',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'sucess',
      data: { data: newDoc },
    });
  });

  test('should use default.jpg if file not provided', async () => {
    const newDoc = { id: 'new-id', name: 'New Doc', photo: 'default.jpg' };
    const mockModel = {
      create: jest.fn().mockResolvedValue(newDoc),
    };

    req.file = undefined;

    const createHandler = createOne(mockModel);
    await createHandler(req, res, next);

    expect(mockModel.create).toHaveBeenCalledWith({
      name: 'Test Name',
      photo: 'default.jpg',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'sucess',
      data: { data: newDoc },
    });
  });
});
