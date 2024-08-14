const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.checkIfUserBookedTour = catchAsync(async (req, res, next) => {
  const booking = await Booking.findOne({
    tour: req.body.tour,
    user: req.body.user,
  });
  if (!booking)
    return next(new AppError('You should book tour to review it!', 403));
  next();
});

exports.checkIfUserReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('No document found with that ID', 404));
  }

  if (req.user.role !== 'admin' && req.user.id !== review.user.id) {
    return next(
      new AppError('You do not have permission to perform this action', 403),
    );
  }

  next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);

// exports.updateReview = async (req, res, next) => {
//   const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!review) {
//     return next(new AppError('No review found with that ID', 404));
//   }

//   res.status(200).json({ status: 'success', data: { review } });
// };

// exports.deleteReview = async (req, res, next) => {
//   const review = await Review.findByIdAndDelete(req.params.id);

//   if (!review) {
//     return next(new AppError('No review found with that ID', 404));
//   }

//   res.status(204).json({ status: 'success', data: null });
// };
