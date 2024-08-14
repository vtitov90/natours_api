/* eslint-disable */
import { showAlert } from './alert';

export const bookTour = async (tourId) => {
  try {
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    location.assign(session.data.session.url);
  } catch (err) {
    console.error('Booking error:', err);

    const errorMessage =
      err.response?.status === 409
        ? 'You have already booked this tour'
        : 'An error occurred while booking the tour';
    showAlert('error', errorMessage);
  }
};
