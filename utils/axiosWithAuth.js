export const axiosWithAuth = axios.create({
  withCredentials: true,
});

axiosWithAuth.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        await fetch('/api/v1/users/refresh-token', {
          method: 'POST',
          credentials: 'include',
        });

        return axiosWithAuth(originalRequest);
      } catch (refreshError) {
        window.location.assign('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  },
);
