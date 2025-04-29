const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.route('/').get(bookingController.getAllBookings);
router
  .route('/:id')
  .delete(
    bookingController.checkIfUserBooking,
    bookingController.deleteBooking,
  );

router.use(authController.restrictTo('lead-guide', 'admin'));

router.route('/').post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking);

module.exports = router;
