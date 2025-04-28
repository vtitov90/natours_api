/* eslint-disable */
import 'regenerator-runtime/runtime.js';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { signup } from './signup';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import {
  createReview,
  updateReview,
  deleteReview,
  createBooking,
  updateBooking,
  deleteBooking,
  createUser,
  updateUser,
  deactivateUser,
} from './apiFactory.js';
import { showAlert } from './alert';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.getElementById('form-user-data');
const userForm = document.getElementById('form-admin-data');
const userPasswordForm = document.getElementById('form-user-password');
const passwordForm = document.getElementById('form-admin-password');
const bookBtn = document.getElementById('book-tour');
const ratingSlider = document.getElementById('rating');
const ratingValueDisplay = document.querySelector('.rating-value');
const reviewForm = document.querySelector('.review-form');
const bookingForm = document.querySelector('.booking-form');
const deleteButtons = document.querySelectorAll('[id=delete-tour]');
const cancelButtons = document.querySelectorAll('[id=cancel]');
const deactivateButtons = document.querySelectorAll('[id=deactivate]');
// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    if (
      document.getElementById('name') &&
      document.getElementById('confirm-password')
    ) {
      const name = document.getElementById('name').value;
      const passwordConfirm = document.getElementById('confirm-password').value;
      signup(name, email, password, passwordConfirm);
    } else {
      login(email, password);
    }
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm)
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    updateSettings(form, 'data');
  });

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password',
    );
    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}

if (ratingSlider) {
  ratingSlider.addEventListener('input', function () {
    ratingValueDisplay.textContent = this.value;
  });

  ratingSlider.addEventListener('change', function () {
    ratingValueDisplay.textContent = parseFloat(this.value).toFixed(1);
  });
}

if (reviewForm) {
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const review = document.getElementById('review').value;
    const rating = document.getElementById('rating').value;
    let id;
    if (window.location.pathname.split('/').includes('edit')) {
      id = window.location.pathname.split('/')[2];
      updateReview(id, { review, rating });
      return;
    }
    id = window.location.pathname.split('/').pop();
    createReview(id, { review, rating });
  });
}

if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tour = document.getElementById('tour').value;
    const user = document.getElementById('user').value;
    const price = document.getElementById('price').value;
    const createdAt = Date.now();
    let id;
    if (window.location.pathname.split('/').includes('edit')) {
      id = window.location.pathname.split('/')[2];
      console.log(price);
      updateBooking(id, { tour, user, price, createdAt, id });
      return;
    }
    createBooking(id, { tour, user, price, createdAt, id });
  });
}

if (userForm) {
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('role', document.getElementById('role').value);
    form.append('active', document.getElementById('active').value);
    form.append('photo', document.getElementById('photo').files[0]);
    if (
      document.getElementById('password-create').value !==
      document.getElementById('passwordConfirm-create').value
    ) {
      showAlert('error', 'Passwords must be the same');
      return;
    }

    if (
      ('password',
      document.getElementById('password-create').value &&
        document.getElementById('passwordConfirm-create').value)
    ) {
      form.append('password', document.getElementById('password-create').value);
      form.append(
        'passwordConfirm',
        document.getElementById('passwordConfirm-create').value,
      );
    }

    let id;
    if (window.location.pathname.split('/').includes('edit')) {
      id = window.location.pathname.split('/')[2];
      updateUser(id, form);
      return;
    }

    createUser(id, form);
  });
}

if (deleteButtons.length > 0) {
  deleteButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();

      const reviewId = this.dataset.reviewId;
      if (confirm('Are you sure you want to delete this review?')) {
        deleteReview(reviewId);
      }

      return false;
    });
  });
}

if (cancelButtons.length > 0) {
  cancelButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const bookingId = this.dataset.bookingId;
      if (confirm('Are you sure you want to cancel this booking?')) {
        deleteBooking(bookingId);
      }

      return false;
    });
  });
}

if (deactivateButtons.length > 0) {
  deactivateButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const id = this.dataset.userId;
      if (confirm('Are you sure you want to deactivate this user?')) {
        deactivateUser(id);
      }

      return false;
    });
  });
}

// const alertMessage = document.querySelector('body').dataset.alert;

// if (alertMessage) {
//   showAlert('success', alertMessage, 10);
// }
