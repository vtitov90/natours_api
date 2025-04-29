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
  authController.protect,
  // bookingController.createBookingCheckout,
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
  '/users/:id/edit',
  authController.protect,
  viewsController.getEditUserForm,
);

router.get(
  '/users/new',
  authController.protect,
  viewsController.getEditUserForm,
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

router.get(
  '/users-list',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getAllUsers,
);

router.get(
  '/statistics',
  authController.protect,
  authController.restrictTo('admin', 'lead-guide'),
  viewsController.getStatisticsPage,
);

router.post(
  '/statistics',
  authController.protect,
  authController.restrictTo('admin', 'lead-guide'),
  viewsController.processStatisticsForm,
);

router.get(
  '/tour-list',
  authController.protect,
  authController.restrictTo('admin', 'lead-guide', 'guide'),
  viewsController.getAllTours,
);

router.get(
  '/tours/new',
  authController.protect,
  viewsController.getEditTourForm,
);

router.get(
  '/tours/:slug/edit',
  authController.protect,
  viewsController.getEditTourForm,
);

module.exports = router;
