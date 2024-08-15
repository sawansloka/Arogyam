const express = require('express');
const commonController = require('../../controller/common.controller');
const publicController = require('../../controller/public.controller');

const router = express.Router();

//Clinic meta data
router.route('/clinic-meta').get(commonController.getClinicMeta);

//Customer feedback
router.route('/feedbacks').post(publicController.createFeedback);

router.route('/testimonials').get(publicController.getTestimonials);

module.exports = router;
