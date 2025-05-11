const Tour = require('../models/tourModel');
const Review = require('../models/reviewModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { getAllUsers } = require('./userController');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert =
      'Your booking was successful! Please check your email for a confirmation! If your booking does not show immediately, please come back later.';
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();
  // 2) Build template

  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', { title: 'All tours', tours });
});

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find()
    .select('createdAt review rating tour user')
    .populate({
      path: 'tour',
      select: 'name imageCover',
    })
    .populate({
      path: 'user',
      select: 'name photo',
    })
    .sort({ 'tour.name': 1 });

  const reviewsByUser = reviews.reduce((acc, review) => {
    const userName = review.user?.name || 'Unknown User';

    if (!acc[userName]) {
      acc[userName] = [];
    }

    acc[userName].push(review);
    return acc;
  }, {});

  const organizedReviews = Object.values(reviewsByUser).flat();

  res.status(200).render('review', {
    title: 'All reviews',
    reviews: organizedReviews,
  });
});

exports.getAllBookings = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find().populate('user', 'name email photo');

  // 2) Get all tour IDs from bookings
  const tourIDs = bookings.map((booking) =>
    typeof booking.tour === 'object' && booking.tour !== null
      ? booking.tour._id
        ? booking.tour._id.toString()
        : booking.tour.toString()
      : booking.tour.toString(),
  );

  // 3) Get all tours in one query
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  // 4) Create a map for quick tour lookup
  const toursMap = new Map();
  tours.forEach((tour) => {
    toursMap.set(tour._id.toString(), tour.toObject());
  });

  // 5) Find all reviews by the current user
  const reviews = await Review.find();

  // 6) Create a Map of tour IDs to review objects for faster lookup
  const reviewsByTourId = new Map();
  reviews.forEach((review) => {
    reviewsByTourId.set(review.tour.toString(), review);
  });

  // 7) Create booking-tour objects for each booking
  const bookingTours = bookings
    .map((booking) => {
      // Get the tour ID
      const tourId =
        typeof booking.tour === 'object' && booking.tour !== null
          ? booking.tour._id
            ? booking.tour._id.toString()
            : booking.tour.toString()
          : booking.tour.toString();

      // Get the tour from our map
      const tourData = toursMap.get(tourId);

      if (!tourData) {
        return null;
      }

      // Create a new object with all tour properties
      const bookingTour = { ...tourData };

      // Add booking specific information
      bookingTour.bookingId = booking._id;
      bookingTour.price = booking.price; // Include the booking price
      bookingTour.createdAt = booking.createdAt; // Include when booking was created
      bookingTour.paid = booking.paid; // Include payment status if applicable

      // If you have other booking-specific fields, add them here
      // For example:
      // bookingTour.participants = booking.participants;
      // bookingTour.bookingDate = booking.bookingDate;

      // Add user information
      bookingTour.user = booking.user;

      // Get the review for this tour if it exists
      const review = reviewsByTourId.get(tourId);

      // Add hasReview boolean and reviewId if a review exists
      bookingTour.hasReview = !!review;
      if (review) {
        bookingTour.reviewId = review._id;
      }

      return bookingTour;
    })
    .filter((item) => item !== null); // Filter out any null values

  res.status(200).render('booking', {
    title: 'All Tours',
    tours: bookingTours,
  });
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ role: { $ne: 'admin' } }).select(
    'name email photo role active',
  );

  res.status(200).render('users', {
    title: 'All Users',
    users,
  });
});

exports.getAllTours = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();

  res.status(200).render('tours', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) return next(new AppError('There is no tour with that name.', 404));

  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;",
    )
    .render('tour', { title: `${tour.name} Tour`, tour });
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
  res.status(200).render('login', { title: 'Log into your account' });
});

exports.getSignUpForm = catchAsync(async (req, res, next) => {
  res.status(200).render('signup', { title: 'Create your account' });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
    // user: req.user,
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Create a Map of tour IDs to booking objects for faster lookup
  const bookingsByTourId = new Map();
  bookings.forEach((booking) => {
    // Make sure we're using just the ID as a string
    let tourId;
    if (typeof booking.tour === 'object' && booking.tour !== null) {
      // If tour is an object with _id property
      tourId = booking.tour._id
        ? booking.tour._id.toString()
        : booking.tour.toString();
    } else {
      // If tour is already an ID
      tourId = booking.tour.toString();
    }

    bookingsByTourId.set(tourId, booking);
  });

  // 3) Find tours with IDs
  const tourIDs = bookings.map((booking) => booking.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  // 4) Find all reviews by the current user
  const reviews = await Review.find({ user: req.user.id });

  // 5) Create a Map of tour IDs to review objects for faster lookup
  const reviewsByTourId = new Map();
  reviews.forEach((review) => {
    reviewsByTourId.set(review.tour.toString(), review);
  });

  // 6) Add review and booking information to each tour
  const toursWithStatusInfo = tours.map((tour) => {
    // Create a new object with all properties from the tour document
    const tourObject = tour.toObject();
    const tourId = tour._id.toString();

    // Get the review for this tour if it exists
    const review = reviewsByTourId.get(tourId);

    // Add hasReview boolean and reviewId if a review exists
    tourObject.hasReview = !!review;
    if (review) {
      tourObject.reviewId = review._id;
    }

    // Add booking ID and details if booking exists
    const booking = bookingsByTourId.get(tourId);
    if (booking) {
      tourObject.bookingId = booking._id;
      // Add booking-specific price
      tourObject.price = booking.price;
      // Add booking date
      tourObject.bookingDate = booking.createdAt;
      // Add payment status if applicable
      tourObject.paid = booking.paid;
      // Add isMyBooking flag
      tourObject.isMyBooking = true;

      // Add any other booking-specific fields you need
      // tourObject.participants = booking.participants;
    }
    return tourObject;
  });

  res.status(200).render('booking', {
    title: 'My Tours',
    tours: toursWithStatusInfo,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  // 1) Find all reviews for the current user
  let reviews = await Review.find({ user: req.user.id })
    .select('createdAt review rating tour user')
    .populate({
      path: 'tour',
      select: 'name imageCover',
    });

  reviews = reviews.map((review) => {
    const newReview = { ...review.toObject() };
    newReview.byMe = true;
    return newReview;
  });

  res.status(200).render('review', {
    title: 'My tours',
    reviews: reviews,
  });
});

exports.getEditReviewForm = async (req, res) => {
  try {
    if (req.params.id) {
      const review = await Review.findById(req.params.id).populate({
        path: 'tour',
        select: 'name',
      });

      if (!review) {
        return res.status(404).render('error', {
          message: 'Review not found',
        });
      }

      return res.render('reviewForm', { review });
    }

    // If there's no review id, we're creating a new one for a specific tour
    const tour = await Tour.findById(req.params.tourId);

    if (!tour) {
      return res.status(404).render('error', {
        message: 'Tour not found',
      });
    }

    res.render('reviewForm', { tour });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      message: 'An error occurred while loading the review form',
    });
  }
};

exports.getEditBookingForm = async (req, res) => {
  let booking;
  const users = await User.find().sort({ name: 1 });
  const tours = await Tour.find().sort({ name: 1 });
  if (req.params.id) {
    booking = await Booking.findById(req.params.id);
  }

  res.render('bookingForm', { booking, users, tours });
};

exports.getEditUserForm = async (req, res) => {
  let user;
  if (req.params.id) {
    user = await User.findById(req.params.id);
  }

  res.render('userForm', { user });
};

exports.getEditTourForm = async (req, res) => {
  let tour;
  if (req.params.slug) {
    tour = await Tour.findOne({ slug: req.params.slug }).populate({
      path: 'guides',
      select: 'name imageCover',
    });
  }
  const users = await User.find({ role: { $in: ['guide', 'lead-guide'] } });

  res.render('tourForm', { tour, guides: users });
};

exports.getStatisticsPage = (req, res, next) => {
  res.status(200).render('statistics');
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});

// controllers/statisticsController.js
exports.processStatisticsForm = async (req, res, next) => {
  const { statisticType } = req.body;

  switch (statisticType) {
    case 'monthly':
      // Get monthly tour statistics
      const monthlyData = await Tour.aggregate([
        { $unwind: '$startDates' },
        {
          $group: {
            _id: { $month: '$startDates' },
            numTourStarts: { $sum: 1 },
            tours: { $push: '$name' },
          },
        },
        {
          $addFields: { month: '$_id' },
        },
        {
          $project: {
            _id: 0,
            month: 1,
            numTourStarts: 1,
            tours: 1,
          },
        },
        {
          $sort: { month: 1 },
        },
      ]);

      // Array of month names
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      // Create complete data for all months (even if no data exists)
      const fullMonthsData = Array.from({ length: 12 }, (_, i) => {
        const existingData = monthlyData.find((item) => item.month === i + 1);
        return {
          month: i + 1,
          monthName: monthNames[i],
          numTourStarts: existingData ? existingData.numTourStarts : 0,
          tours: existingData ? existingData.tours : [],
        };
      });

      // Format data for chart
      const chartData = {
        labels: fullMonthsData.map((item) => item.monthName),
        datasets: [
          {
            label: 'Number of Tours per Month',
            data: fullMonthsData.map((item) => item.numTourStarts),
            backgroundColor: '#7dd56f',
          },
        ],
      };

      // Pass data to template
      res.render('chart', {
        title: 'Tour Statistics Chart',
        chartData: JSON.stringify(chartData),
      });
      break;

    case 'popular':
      // Get popular tours based on bookings
      const popularTours = await Booking.aggregate([
        {
          $group: {
            _id: '$tour',
            bookingsCount: { $sum: 1 },
            totalRevenue: { $sum: '$price' },
          },
        },
        {
          $lookup: {
            from: 'tours',
            localField: '_id',
            foreignField: '_id',
            as: 'tourDetails',
          },
        },
        {
          $unwind: '$tourDetails',
        },
        {
          $project: {
            _id: 1,
            tourName: '$tourDetails.name',
            bookingsCount: 1,
            totalRevenue: 1,
            averagePrice: { $divide: ['$totalRevenue', '$bookingsCount'] },
          },
        },
        {
          $sort: { bookingsCount: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Format data for chart
      const popularChartData = {
        labels: popularTours.map((tour) => tour.tourName),
        datasets: [
          {
            label: 'Number of Bookings',
            data: popularTours.map((tour) => tour.bookingsCount),
            backgroundColor: '#7dd56f',
            borderColor: '#55c57a',
            borderWidth: 1,
          },
          {
            label: 'Revenue ($)',
            data: popularTours.map((tour) => tour.totalRevenue),
            backgroundColor: '#2998ff',
            borderColor: '#5643fa',
            borderWidth: 1,
            yAxisID: 'revenue',
          },
        ],
      };

      // Additional data for the template
      const popularToursData = popularTours.map((tour) => ({
        name: tour.tourName,
        bookings: tour.bookingsCount,
        revenue: tour.totalRevenue.toFixed(2),
        averagePrice: tour.averagePrice.toFixed(2),
      }));

      // Pass data to template
      res.render('chart', {
        title: 'Popular Tours Statistics',
        chartData: JSON.stringify(popularChartData),
        chartType: 'bar',
        toursData: popularToursData,
        chartOptions: JSON.stringify({
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Bookings',
              },
            },
            revenue: {
              position: 'right',
              beginAtZero: true,
              title: {
                display: true,
                text: 'Revenue ($)',
              },
            },
          },
        }),
      });
      break;

    case 'userRoles':
      // Get count of users by role
      const userRoles = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            role: '$_id',
            count: 1,
            _id: 0,
          },
        },
        {
          $sort: { role: 1 },
        },
      ]);

      console.log(userRoles);
      // Format data for chart
      const userRolesChartData = {
        labels: userRoles.map((item) => item.role),
        datasets: [
          {
            label: 'User Count by Role',
            data: userRoles.map((item) => item.count),
            backgroundColor: '#7dd56f',
            borderWidth: 1,
          },
        ],
      };

      // Pass data to template
      res.render('chart', {
        title: 'User Roles Distribution',
        chartData: JSON.stringify(userRolesChartData),
        chartType: 'pie',
        userData: userRoles,
        chartOptions: JSON.stringify({
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
        }),
      });
      break;

    case 'topBookers':
      // Get users with the most bookings
      const topBookers = await Booking.aggregate([
        {
          $group: {
            _id: '$user',
            bookingsCount: { $sum: 1 },
            totalSpent: { $sum: '$price' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $unwind: '$userDetails',
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            name: '$userDetails.name',
            email: '$userDetails.email',
            bookingsCount: 1,
            totalSpent: 1,
            averageSpend: { $divide: ['$totalSpent', '$bookingsCount'] },
          },
        },
        {
          $sort: { bookingsCount: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Format data for chart
      const topBookersChartData = {
        labels: topBookers.map((user) => user.name),
        datasets: [
          {
            label: 'Number of Bookings',
            data: topBookers.map((user) => user.bookingsCount),
            backgroundColor: '#7dd56f',
            borderColor: '#55c57a',
            borderWidth: 1,
          },
          {
            label: 'Total Spent ($)',
            data: topBookers.map((user) => user.totalSpent),
            backgroundColor: '#2998ff',
            borderColor: '#5643fa',
            borderWidth: 1,
            yAxisID: 'spent',
          },
        ],
      };

      // Additional data for the template
      const topBookersData = topBookers.map((user) => ({
        name: user.name,
        email: user.email,
        bookings: user.bookingsCount,
        spent: user.totalSpent.toFixed(2),
        averageSpend: user.averageSpend.toFixed(2),
      }));

      // Pass data to template
      res.render('chart', {
        title: 'Top Bookers',
        chartData: JSON.stringify(topBookersChartData),
        chartType: 'bar',
        userData: topBookersData,
        chartOptions: JSON.stringify({
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Bookings',
              },
            },
            spent: {
              position: 'right',
              beginAtZero: true,
              title: {
                display: true,
                text: 'Total Spent ($)',
              },
            },
          },
        }),
      });
      break;

    case 'priceDistribution':
      // Define price ranges
      const priceRanges = [
        { min: 0, max: 500, label: '$0 - $500' },
        { min: 501, max: 1000, label: '$501 - $1000' },
        { min: 1001, max: 1500, label: '$1001 - $1500' },
        { min: 1501, max: 2000, label: '$1501 - $2000' },
        { min: 2001, max: Infinity, label: '$2001+' },
      ];

      // Get all bookings with price
      const bookings = await Booking.aggregate([
        {
          $project: {
            price: 1,
          },
        },
      ]);

      // Count bookings in each price range
      const priceDistribution = priceRanges.map((range) => {
        const count = bookings.filter(
          (booking) => booking.price >= range.min && booking.price <= range.max,
        ).length;

        return {
          range: range.label,
          count,
        };
      });

      // Format data for chart
      const priceDistributionChartData = {
        labels: priceDistribution.map((item) => item.range),
        datasets: [
          {
            label: 'Number of Bookings',
            data: priceDistribution.map((item) => item.count),
            backgroundColor: '#7dd56f',
            borderWidth: 1,
          },
        ],
      };

      // Pass data to template
      res.render('chart', {
        title: 'Booking Price Distribution',
        chartData: JSON.stringify(priceDistributionChartData),
        chartType: 'bar',
        distributionData: priceDistribution,
        chartOptions: JSON.stringify({
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Bookings',
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} bookings (${percentage}%)`;
                },
              },
            },
          },
        }),
      });
      break;

    default:
      return next(new AppError('Unknown action', 500));
  }
};
