const { processStatisticsForm } = require('../../controllers/viewsController');
const Tour = require('../../models/tourModel');
const Booking = require('../../models/bookingModel');
const AppError = require('../../utils/appError');

jest.mock('../../models/tourModel');
jest.mock('../../models/bookingModel');
jest.mock('../../utils/appError');

describe('processStatisticsForm Controller', () => {
  let req;
  let res;
  let next;
  let mockAggregate;

  beforeEach(() => {
    req = {
      body: {},
    };

    res = {
      render: jest.fn(),
    };

    next = jest.fn();

    mockAggregate = jest.fn();

    jest.clearAllMocks();
  });

  test('should process monthly statistics correctly', async () => {
    req.body.statisticType = 'monthly';

    const monthlyData = [
      { month: 1, numTourStarts: 2, tours: ['Tour 1', 'Tour 2'] },
      { month: 6, numTourStarts: 3, tours: ['Tour 3', 'Tour 4', 'Tour 5'] },
    ];

    Tour.aggregate.mockResolvedValue(monthlyData);

    await processStatisticsForm(req, res, next);

    expect(Tour.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { $unwind: '$startDates' },
        {
          $group: {
            _id: { $month: '$startDates' },
            numTourStarts: { $sum: 1 },
            tours: { $push: '$name' },
          },
        },
      ]),
    );

    expect(res.render).toHaveBeenCalledWith('chart', {
      title: 'Tour Statistics Chart',
      chartData: expect.any(String),
    });

    const chartData = JSON.parse(res.render.mock.calls[0][1].chartData);
    expect(chartData).toHaveProperty('labels');
    expect(chartData).toHaveProperty('datasets');
    expect(chartData.labels.length).toBe(12);
    expect(chartData.datasets[0].data[0]).toBe(2);
    expect(chartData.datasets[0].data[5]).toBe(3);
  });

  test('should process popular tours statistics correctly', async () => {
    req.body.statisticType = 'popular';

    const popularTours = [
      {
        _id: 'tour-1',
        tourName: 'Tour 1',
        bookingsCount: 10,
        totalRevenue: 2970,
        averagePrice: 297,
      },
      {
        _id: 'tour-2',
        tourName: 'Tour 2',
        bookingsCount: 8,
        totalRevenue: 3976,
        averagePrice: 497,
      },
    ];

    Booking.aggregate.mockResolvedValue(popularTours);

    await processStatisticsForm(req, res, next);

    expect(Booking.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          $group: {
            _id: '$tour',
            bookingsCount: { $sum: 1 },
            totalRevenue: { $sum: '$price' },
          },
        },
      ]),
    );

    expect(res.render).toHaveBeenCalledWith('chart', {
      title: 'Popular Tours Statistics',
      chartData: expect.any(String),
      chartType: 'bar',
      toursData: expect.arrayContaining([
        {
          name: 'Tour 1',
          bookings: 10,
          revenue: '2970.00',
          averagePrice: '297.00',
        },
        {
          name: 'Tour 2',
          bookings: 8,
          revenue: '3976.00',
          averagePrice: '497.00',
        },
      ]),
      chartOptions: expect.any(String),
    });

    const chartData = JSON.parse(res.render.mock.calls[0][1].chartData);
    expect(chartData).toHaveProperty('labels');
    expect(chartData).toHaveProperty('datasets');
    expect(chartData.labels).toEqual(['Tour 1', 'Tour 2']);
    expect(chartData.datasets[0].data).toEqual([10, 8]);
    expect(chartData.datasets[1].data).toEqual([2970, 3976]);
  });
});
