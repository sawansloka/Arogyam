const express = require('express');
const adminController = require('../../controller/admin.controller');
const adminAuth = require('../../middleware/adminAuth');

const router = express.Router();

// Authentication routes for Admins
router.route('/signup').post(adminController.signUp);

router.route('/login').post(adminController.login);

router.route('/forgot-password').post(adminController.forgotPassword);

router.route('/logout').post(adminAuth, adminController.logout);

// Clinic meta data
router
  .route('/clinic-meta')
  .post(adminAuth, adminController.upsertClinicMeta)
  .get(adminAuth, adminController.getClinicMeta);

router
  .route('/clinic-meta/:metaId')
  .put(adminAuth, adminController.updateClinicMetaData)
  .delete(adminAuth, adminController.deleteClinicMeta);

// Customer Feedback data
router.route('/feedbacks').get(adminAuth, adminController.listAllFeedbacks);

router
  .route('/feedbacks/:id')
  .get(adminAuth, adminController.getFeedbackById)
  .put(adminAuth, adminController.updateFeedbackById)
  .delete(adminAuth, adminController.deleteFeedback);

// schedule slots
router
  .route('/schedule')
  .post(adminAuth, adminController.setSchedule)
  .get(adminAuth, adminController.listSchedules);

router
  .route('/schedule/:id')
  .put(adminAuth, adminController.updateSchedule)
  .get(adminAuth, adminController.getScheduleById)
  .delete(adminAuth, adminController.deleteSchedule);

// appointment booking
router.route('/appointments').get(adminAuth, adminController.listAppointments);

router
  .route('/appointments/:id')
  .get(adminAuth, adminController.getAppointmentById)
  .put(adminAuth, adminController.editAppointmentById)
  .delete(adminAuth, adminController.deleteAppointmentById);

// enable or disable schedule
router.route('/cron-job').post(adminAuth, adminController.toggleCronJob);

// prescription
router
  .route('/prescriptions')
  .post(adminAuth, adminController.createOrUpdatePrescription);

router
  .route('/prescriptions/pdf')
  .post(adminController.generatePrescriptionPDF);

module.exports = router;
