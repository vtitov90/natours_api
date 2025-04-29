/* eslint-disable */
import { showAlert } from './alert';
import { axiosWithAuth } from '../../utils/axiosWithAuth';

export const createApiHandler = (
  entity,
  operation,
  redirectUrl,
  successMessage,
) => {
  return async (id, data) => {
    try {
      let method, url;

      switch (operation) {
        case 'create':
          method = 'POST';
          url = `/api/v1/${entity}`;
          break;
        case 'createReview':
          method = 'POST';
          url = `/api/v1/tours/${id}/reviews`;
          break;
        case 'update':
          method = 'PATCH';
          url = `/api/v1/${entity}/${id}`;
          break;
        case 'delete':
          method = 'DELETE';
          url = `/api/v1/${entity}/${id}`;
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const config = {
        method,
        url,
      };

      if (
        data &&
        (operation === 'create' ||
          operation === 'update' ||
          operation == 'createReview')
      ) {
        config.data = data;
      }

      const res = await axiosWithAuth(config);

      const isSuccess =
        (res.status >= 200 && res.status < 300) ||
        (res.data && res.data.status === 'success');

      if (isSuccess) {
        showAlert('success', successMessage);

        if (redirectUrl) {
          window.setTimeout(() => {
            location.href = redirectUrl;
          }, 700);
        }

        return res.data;
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Something went wrong');
      throw err;
    }
  };
};

export const updateReview = createApiHandler(
  'reviews',
  'update',
  '/me',
  'Review updated successfully!',
);
export const createReview = createApiHandler(
  'reviews',
  'createReview',
  '/me',
  'Review created successfully!',
);
export const deleteReview = createApiHandler(
  'reviews',
  'delete',
  '/me',
  'Review deleted successfully!',
);

export const createBooking = createApiHandler(
  'bookings',
  'create',
  '/me',
  'Booking created successfully!',
);
export const updateBooking = createApiHandler(
  'bookings',
  'update',
  '/me',
  'Booking updated successfully!',
);

export const deleteBooking = createApiHandler(
  'bookings',
  'delete',
  '/me',
  'Booking canceled successfully!',
);

export const createUser = createApiHandler(
  'users',
  'create',
  '/me',
  'User created successfully!',
);

export const updateUser = createApiHandler(
  'users',
  'update',
  '/me',
  'User updated successfully!',
);

export const deactivateUser = createApiHandler(
  'users',
  'delete',
  '/me',
  'User deactivated successfully!',
);

export const createTour = createApiHandler(
  'tours',
  'create',
  '/me',
  'Tour created successfully!',
);

export const updateTour = createApiHandler(
  'tours',
  'update',
  '/me',
  'Tour updated successfully!',
);

export const deleteTour = createApiHandler(
  'tours',
  'delete',
  '/me',
  'Tour deleted successfully!',
);
