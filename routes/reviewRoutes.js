const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// router.param('id', reviewController.checkID);

// POST tour/someId/reviews
// POST tour/reviews

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    reviewController.setTourUserIds,
    reviewController.checkIfUserBookedTour,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(reviewController.checkIfUserReview, reviewController.updateReview)
  .delete(reviewController.checkIfUserReview, reviewController.deleteReview);

module.exports = router;
