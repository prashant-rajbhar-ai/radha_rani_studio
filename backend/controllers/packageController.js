const Package = require('./../models/packageModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getAllPackages = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Package.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const packages = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: packages.length,
    data: {
      packages
    }
  });
});

exports.getPackage = catchAsync(async (req, res, next) => {
  const pkg = await Package.findById(req.params.id);

  if (!pkg) {
    return next(new AppError('No package found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      package: pkg
    }
  });
});

exports.createPackage = catchAsync(async (req, res, next) => {
  const newPackage = await Package.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      package: newPackage
    }
  });
});

exports.updatePackage = catchAsync(async (req, res, next) => {
  const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!pkg) {
    return next(new AppError('No package found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      package: pkg
    }
  });
});

exports.deletePackage = catchAsync(async (req, res, next) => {
  const pkg = await Package.findByIdAndDelete(req.params.id);

  if (!pkg) {
    return next(new AppError('No package found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});