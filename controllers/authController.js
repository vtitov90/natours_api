const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });

// for tests add exports.
const createSendToken = async (user, statusCode, req, res) => {
  const accessToken = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('jwt', accessToken, {
    maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 60 * 1000,
    httpOnly: true,
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
  });

  res.cookie('refresh', refreshToken, {
    maxAge: process.env.REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    data: {
      user,
    },
  });
};

exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.refresh;
  if (!token) {
    return next(new AppError('Refresh token missing', 401));
  }

  const decoded = await promisify(jwt.verify)(
    token,
    process.env.REFRESH_TOKEN_SECRET,
  );

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    return next(new AppError('Invalid refresh token', 403));
  }

  const newAccessToken = signToken(user._id);

  res.cookie('jwt', newAccessToken, {
    maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 60 * 1000,
    httpOnly: true,
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
  });

  res.status(200).json({
    status: 'success',
    accessToken: newAccessToken,
  });
});

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists && password is
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything is ok, send token to client
  await createSendToken(user, 200, req, res);
});

exports.logout = async (req, res) => {
  res.clearCookie('jwt');
  res.clearCookie('refresh');

  if (req.user) {
    const user = await User.findById(req.user.id).select('+refreshToken');
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
  }
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies.refresh;
  let token;
  let freshUser;
  let tokenIat;

  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  try {
    if (token) {
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET,
      );
      tokenIat = decoded.iat;
      freshUser = await User.findById(decoded.id);
    } else {
      throw new Error('No access token');
    }
  } catch (err) {
    if (!refreshToken) return next(new AppError('Please log in', 401));

    try {
      const decodedRefresh = await promisify(jwt.verify)(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
      );

      const user = await User.findById(decodedRefresh.id).select(
        '+refreshToken',
      );

      if (!user || user.refreshToken !== refreshToken) {
        return next(new AppError('Invalid refresh token', 403));
      }

      const newAccessToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN,
        },
      );

      res.cookie('jwt', newAccessToken, {
        maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 60 * 1000,
        httpOnly: true,
        secure: req.secure || req.get('x-forwarded-proto') === 'https',
      });

      freshUser = user;

      tokenIat = null;
    } catch {
      return next(new AppError('Session expired, please log in again', 401));
    }
  }

  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401),
    );
  }

  if (
    tokenIat &&
    freshUser.changedPasswordAfter &&
    freshUser.changedPasswordAfter(tokenIat)
  ) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  req.user = freshUser;
  res.locals.user = freshUser;

  next();
});

// Only for render pages, no errors!
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (!req.cookies.jwt && !req.cookies.refresh) {
    return next();
  }

  let decoded;

  try {
    decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );
  } catch (err) {
    if (req.cookies.refresh) {
      try {
        const refreshDecoded = await promisify(jwt.verify)(
          req.cookies.refresh,
          process.env.REFRESH_TOKEN_SECRET,
        );

        const user = await User.findById(refreshDecoded.id).select(
          '+refreshToken',
        );

        if (!user || user.refreshToken !== req.cookies.refresh) {
          return next();
        }

        const newAccessToken = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.JWT_EXPIRES_IN,
          },
        );

        res.cookie('jwt', newAccessToken, {
          maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 60 * 1000,
          httpOnly: true,
          secure: req.secure || req.get('x-forwarded-proto') === 'https',
        });

        decoded = await promisify(jwt.verify)(
          newAccessToken,
          process.env.JWT_SECRET,
        );
      } catch (err2) {
        return next();
      }
    } else {
      return next();
    }
  }

  const curUser = await User.findById(decoded.id);
  if (!curUser) return next();

  if (curUser.changedPasswordAfter(decoded.iat)) return next();

  res.locals.user = curUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next('There is no user with that email address', 404);
  }

  // 2) Genereate random reset token
  const resetToken = user.createdPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to the user's email
  try {
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token in invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user

  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    // passwordCurrent
    return next(new AppError('Your current password is wrong!', 401));
  }

  // 3) If so update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); //User.findByIdAndUpdate won't work!

  // 4) Log user in send JWT
  createSendToken(user, 200, req, res);
});
