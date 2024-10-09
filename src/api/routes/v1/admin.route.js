const express = require('express');
const adminController = require('../../controller/admin.controller');
const adminAuth = require('../../middleware/adminAuth');
const restrictToDoctor = require('../../middleware/restrictToDoctor');
const { uploadSimple } = require('../../middleware/multer');

const router = express.Router();

// Authentication routes for Admins
router.route('/signup').post(adminController.signUp);

router.route('/login').post(adminController.login);

router.route('/forgot-password').post(adminController.forgotPassword);

router.route('/logout').post(adminAuth, adminController.logout);

router.route('/jwtvalidate').post(adminController.jwtValidate);

// Clinic meta data
router
  .route('/clinic-meta')
  .post(adminAuth, restrictToDoctor, adminController.upsertClinicMeta)
  .get(adminAuth, restrictToDoctor, adminController.getClinicMeta);

router
  .route('/clinic-meta/:metaId')
  .put(
    adminAuth,
    uploadSimple.single('bannerUrl'),
    adminController.updateClinicMetaData
  )
  .delete(adminAuth, restrictToDoctor, adminController.deleteClinicMeta);

// Customer Feedback data
router
  .route('/feedbacks')
  .get(adminAuth, restrictToDoctor, adminController.listAllFeedbacks);

router
  .route('/feedbacks/:id')
  .get(adminAuth, restrictToDoctor, adminController.getFeedbackById)
  .put(adminAuth, restrictToDoctor, adminController.updateFeedbackById)
  .delete(adminAuth, restrictToDoctor, adminController.deleteFeedback);

// schedule slots
router
  .route('/schedule')
  .post(adminAuth, restrictToDoctor, adminController.setSchedule)
  .get(adminAuth, adminController.listSchedules);

router
  .route('/schedule/:id')
  .put(adminAuth, restrictToDoctor, adminController.updateSchedule)
  .get(adminAuth, adminController.getScheduleById)
  .delete(adminAuth, restrictToDoctor, adminController.deleteSchedule);

// appointment booking
router.route('/appointments').get(adminAuth, adminController.listAppointments);

router
  .route('/appointments/:id')
  .get(adminAuth, adminController.getAppointmentById)
  .put(adminAuth, adminController.editAppointmentById)
  .delete(adminAuth, adminController.deleteAppointmentById);

// enable or disable schedule
router
  .route('/cron-job')
  .post(adminAuth, restrictToDoctor, adminController.toggleCronJob);

// prescription
router
  .route('/prescriptions')
  .post(adminAuth, restrictToDoctor, adminController.createPrescription);

router
  .route('/prescriptions')
  .get(adminAuth, adminController.getAllPrescriptions);

router
  .route('/prescriptions/:id')
  .put(adminAuth, restrictToDoctor, adminController.updatePrescription);

router
  .route('/prescriptions/:id')
  .get(adminAuth, adminController.getPrescriptionById);

router
  .route('/prescriptions/:id')
  .delete(adminAuth, restrictToDoctor, adminController.deletePrescription);

router
  .route('/prescriptions/pdf')
  .post(adminAuth, adminController.generatePrescriptionPDF);

router
  .route('/get-patient-data/:id')
  .get(adminAuth, adminController.getPatientData);

module.exports = router;
