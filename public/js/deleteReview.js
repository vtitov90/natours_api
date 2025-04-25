import { showAlert } from './alert';
import { axiosWithAuth } from '../../utils/axiosWithAuth';

export const deleteReview = async (id) => {
  try {
    const res = await axiosWithAuth({
      method: 'DELETE',
      url: `/api/v1/reviews/${id}`,
    });
    console.log(res);
    if (res.status === 204) {
      showAlert('success', 'Review deleted successfully!');

      window.setTimeout(() => {
        location.reload();
      }, 700);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'Error deleting review');
  }
};
