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
  createTour,
  updateTour,
  deleteTour,
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
const deleteButtons = document.querySelectorAll('[id=delete-review]');
const deleteTourButtons = document.querySelectorAll('[id=delete-tour]');
const cancelButtons = document.querySelectorAll('[id=cancel]');
const deactivateButtons = document.querySelectorAll('[id=deactivate]');

const addLocationBtn = document.querySelector('.add-location-btn');
const addDateBtn = document.querySelector('.add-date-btn');
const locationsContainer = document.querySelector('.locations-container');
const datesContainer = document.querySelector('.dates-container');

const tourForm = document.getElementById('form-tour-data');

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
    if (document.getElementById('photo').files[0]) {
      form.append('photo', document.getElementById('photo').files[0]);
    }

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

if (deleteTourButtons.length > 0) {
  deleteTourButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();

      const tourId = this.dataset.tourId;
      if (confirm('Are you sure you want to delete this tour?')) {
        deleteTour(tourId);
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

if (addLocationBtn) {
  addLocationBtn.addEventListener('click', function (e) {
    e.preventDefault();

    // Получаем количество существующих локаций
    const locationGroups =
      locationsContainer.querySelectorAll('.location-group');
    const index = locationGroups.length;

    // Создаем новую группу локаций
    const html = `
      <div class="form__group location-group">
        <h4 class="form__label">Location ${index + 1}</h4>
        <div class="form__group">
          <label class="form__label" for="locationDesc${index}">Description</label>
          <input class="form__input" id="locationDesc${index}" type="text" name="locations[${index}][description]">
        </div>
        <div class="form__group">
          <label class="form__label" for="locationDay${index}">Day</label>
          <input class="form__input" id="locationDay${index}" type="number" min="1" name="locations[${index}][day]">
        </div>
        <div class="form__group">
          <label class="form__label" for="locationLat${index}">Latitude</label>
          <input class="form__input" id="locationLat${index}" type="text" name="locations[${index}][lat]">
        </div>
        <div class="form__group">
          <label class="form__label" for="locationLng${index}">Longitude</label>
          <input class="form__input" id="locationLng${index}" type="text" name="locations[${index}][lng]">
        </div>
      </div>
    `;

    // Вставляем новую группу локаций перед кнопкой
    locationsContainer.insertAdjacentHTML('beforeend', html);
  });
}

// Обработчик для добавления новой даты
if (addDateBtn) {
  addDateBtn.addEventListener('click', function (e) {
    e.preventDefault();

    // Получаем количество существующих дат
    const dateInputs = datesContainer.querySelectorAll('input[type="date"]');
    const index = dateInputs.length;

    // Создаем новую группу для даты
    const html = `
      <div class="form__group">
        <label class="form__label" for="date${index}">Date ${index + 1}</label>
        <input class="form__input" id="date${index}" type="date" name="startDates[${index}]">
      </div>
    `;

    // Вставляем новую дату в контейнер
    datesContainer.insertAdjacentHTML('beforeend', html);
  });
}

if (tourForm) {
  tourForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Создаем FormData объект
    const form = new FormData();

    // Добавляем основные данные тура
    form.append('name', document.getElementById('name').value);
    form.append('summary', document.getElementById('summary').value);
    form.append('description', document.getElementById('description').value);
    form.append('duration', document.getElementById('duration').value);
    form.append('maxGroupSize', document.getElementById('maxGroupSize').value);
    form.append('difficulty', document.getElementById('difficulty').value);
    form.append('price', document.getElementById('price').value);

    // Добавляем данные о начальной локации
    const startLocation = {
      description: document.getElementById('startDescription').value,
      type: 'Point',
      coordinates: [
        parseFloat(document.getElementById('startLng').value),
        parseFloat(document.getElementById('startLat').value),
      ],
      address: document.getElementById('startAddress').value,
    };
    form.append(
      'startLocation[description]',
      document.getElementById('startDescription').value,
    );
    form.append('startLocation[type]', 'Point');
    form.append(
      'startLocation[coordinates][0]',
      parseFloat(document.getElementById('startLng').value),
    );
    form.append(
      'startLocation[coordinates][1]',
      parseFloat(document.getElementById('startLat').value),
    );
    form.append(
      'startLocation[address]',
      document.getElementById('startAddress').value,
    );

    // Добавляем изображение обложки
    const imageCoverInput = document.getElementById('imageCover');
    if (imageCoverInput.files[0]) {
      form.append('imageCover', imageCoverInput.files[0]);
    }

    // Добавляем дополнительные изображения
    const imagesInput = document.getElementById('images');
    if (imagesInput.files.length > 0) {
      for (let i = 0; i < imagesInput.files.length; i++) {
        form.append('images', imagesInput.files[i]);
      }
    }
    console.log(imageCoverInput);
    console.log(imagesInput);
    // Добавляем гидов
    const guidesSelect = document.getElementById('guides');
    if (guidesSelect) {
      const selectedGuides = Array.from(guidesSelect.selectedOptions).map(
        (option) => option.value,
      );
      selectedGuides.forEach((guide) => form.append('guides', guide));
    }

    // Собираем и добавляем все локации
    const locationGroups = document.querySelectorAll('.location-group');
    const locations = [];

    locationGroups.forEach((group, i) => {
      const description = document.getElementById(`locationDesc${i}`).value;
      const day = parseInt(document.getElementById(`locationDay${i}`).value);
      const lat = parseFloat(document.getElementById(`locationLat${i}`).value);
      const lng = parseFloat(document.getElementById(`locationLng${i}`).value);

      if (description && day && !isNaN(lat) && !isNaN(lng)) {
        locations.push({
          description,
          type: 'Point',
          coordinates: [lng, lat],
          day,
        });
      }
    });

    locations.forEach((loc, i) => {
      form.append(`locations[${i}][description]`, loc.description);
      form.append(`locations[${i}][type]`, loc.type);
      form.append(`locations[${i}][coordinates][0]`, loc.coordinates[0]);
      form.append(`locations[${i}][coordinates][1]`, loc.coordinates[1]);
      form.append(`locations[${i}][day]`, loc.day);
    });

    // Собираем и добавляем все даты начала тура
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const startDates = [];

    dateInputs.forEach((input) => {
      if (input.value) {
        // Превращаем дату в формат ISO для API
        const date = new Date(input.value);
        // Устанавливаем время на 9:00 как в примере
        date.setHours(9, 0, 0, 0);
        startDates.push(date.toISOString());
      }
    });

    startDates.forEach((date, i) => {
      form.append(`startDates[${i}]`, date);
    });

    const isNewTour = !window.location.pathname.includes('edit');
    if (isNewTour) {
      createTour(null, form);
      return;
    }
    updateTour(window.location.pathname.split('/')[2], form);
  });
}
// const alertMessage = document.querySelector('body').dataset.alert;

// if (alertMessage) {
//   showAlert('success', alertMessage, 10);
// }
