const express = require('express');
const publicController = require('../../controller/public.controller');

const router = express.Router();

// Clinic meta data
router.route('/clinic-meta').get(publicController.getClinicMeta);

router.route('/clinic-meta/banner').get(publicController.getClinicMetaBanner);

// Customer feedback
router.route('/feedbacks').post(publicController.createFeedback);

router.route('/testimonials').get(publicController.getTestimonials);

// Appointment booking
router.route('/slots').get(publicController.listAvailableSlots);

router.route('/appointments').post(publicController.bookAppointment);

router.route('/track-status').get(publicController.trackAppointmentStatus);

// Patient Portal
router.route('/patient-portal').get(publicController.patientPortal);

module.exports = router;
