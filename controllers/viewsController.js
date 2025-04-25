const Tour = require('../models/tourModel');
const Review = require('../models/reviewModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

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

    // Add booking ID if booking exists
    const booking = bookingsByTourId.get(tourId);
    if (booking) {
      tourObject.bookingId = booking._id;
    } else {
      console.log(`No booking found for tour ${tourId}`);
    }

    return tourObject;
  });

  // Result
  if (toursWithStatusInfo.length > 0) {
    console.log('Final result sample:', toursWithStatusInfo[0]);
  }

  res.status(200).render('booking', {
    title: 'My tours',
    tours: toursWithStatusInfo,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  // 1) Find all reviews for the current user
  const reviews = await Review.find({ user: req.user.id }).populate({
    path: 'tour',
    select: 'name imageCover',
  });

  res.status(200).render('review', {
    title: 'My tours',
    reviews: reviews,
  });
});

exports.getEditReviewForm = async (req, res) => {
  if (req.params.id) {
    const review = await Review.findById(req.params.id).populate({
      path: 'tour',
      select: 'name',
    });
    res.render('reviewForm', { review });
  }
  const tour = await Tour.findById(req.params.tourId);
  res.render('reviewForm', { tour });
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
