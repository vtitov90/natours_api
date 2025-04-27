const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
// const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(viewsController.alerts);

router.get('/', authController.isLoggedIn, viewsController.getOverview);

router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/signup', authController.isLoggedIn, viewsController.getSignUpForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get(
  '/my-tours',
  // bookingController.createBookingCheckout,
  authController.protect,
  viewsController.getMyTours,
);
router.get('/my-reviews', authController.protect, viewsController.getMyReviews);
router.get(
  '/reviews/:id/edit',
  authController.protect,
  viewsController.getEditReviewForm,
);

router.get(
  '/bookings/:id/edit',
  authController.protect,
  viewsController.getEditBookingForm,
);

router.get(
  '/reviews/new/:tourId',
  authController.protect,
  viewsController.getEditReviewForm,
);

router.get(
  '/bookings/new',
  authController.protect,
  viewsController.getEditBookingForm,
);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData,
);

router.get(
  '/reviews-list',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getAllReviews,
);

router.get(
  '/bookings-list',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getAllBookings,
);

module.exports = router;
