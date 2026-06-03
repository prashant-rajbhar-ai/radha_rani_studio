const express = require('express');

const packageController = require('./../controllers/packageController'); 
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(packageController.getAllPackages) // Anyone can view packages
  .post(
    authController.protect, 
    authController.restrictTo('admin'), // Only you can create new packages
    packageController.createPackage
  );

router
  .route('/:id')
  .get(packageController.getPackage)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    packageController.updatePackage
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    packageController.deletePackage
  );

module.exports = router;