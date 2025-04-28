const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const User = require('../models/userModel');
const Tour = require('../models/tourModel');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let doc;
    if (Model === User) {
      doc = await Model.findByIdAndUpdate(req.params.id, { active: false });
    } else {
      doc = await Model.findByIdAndDelete(req.params.id);
    }

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({ status: 'success', data: null });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    if (req.file) req.body.photo = req.file.filename;
    let doc;
    if (Model === Tour) {
      doc = await Tour.findOneAndUpdate({ slug: req.params.id }, req.body, {
        new: true,
        runValidators: true,
      });
    } else {
      doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({ status: 'success', data: { data: doc } });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    if (req.file) req.body.photo = req.file.filename;
    else req.body.photo = 'default.jpg';
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'sucess',
      data: {
        data: newDoc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { data: doc } });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    // EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: { data: doc },
    });
  });
