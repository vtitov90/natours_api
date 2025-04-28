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
