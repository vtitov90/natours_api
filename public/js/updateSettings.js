/* eslint-disable */
import { showAlert } from './alert';
import { axiosWithAuth } from '../../utils/axiosWithAuth';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';

    const res = await axiosWithAuth({
      method: 'PATCH',
      url,
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);

      try {
        await axios.post('/api/v1/users/refresh-token', null, {
          withCredentials: true,
        });

        window.setTimeout(() => {
          window.location.href = '/me'; // or location.reload()
        }, 700);
      } catch (refreshError) {
        showAlert('error', 'Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'Something went wrong');
  }
};
