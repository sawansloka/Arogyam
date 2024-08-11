const express = require('express');
const adminController = require('../../controller/admin.controller');
const commonController = require('../../controller/common.controller');
const adminAuth = require('../../middleware/adminAuth');

const router = express.Router();

//Clinic meta data
router.route('/clinic-meta').post(adminAuth, adminController.upsertClinicMeta)
    .get(adminAuth, commonController.getClinicMeta);

//Customer Feedback data
router.route('/feedbacks')
    .get(adminAuth, adminController.listAllFeedbacks);

router.route('/feedbacks/:id')
    .get(adminAuth, adminController.getFeedbackById)
    .put(adminAuth, adminController.updateFeedbackById)
    .delete(adminAuth, adminController.deleteFeedback);

module.exports = router;
