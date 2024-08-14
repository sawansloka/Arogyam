const express = require('express');
const adminController = require('../../controller/admin.controller');
const commonController = require('../../controller/common.controller');
const adminAuth = require('../../middleware/adminAuth');

const router = express.Router();

//Clinic meta data
router.route('/clinic-meta').post(adminAuth, adminController.upsertClinicMeta)
    .get(adminAuth, commonController.getClinicMeta);

router.route('/clinic-meta/:metaId')
    .put(adminAuth, adminController.updateClinicMetaData);

router.route('/clinic-meta/:metaId')
    .delete(adminAuth, adminController.deleteClinicMeta);

//Customer feedback data

//Customer Feedback data
router.route('/feedbacks')
    .get(adminAuth, adminController.listAllFeedbacks);

router.route('/feedbacks/:id')
    .get(adminAuth, adminController.getFeedbackById)
    .put(adminAuth, adminController.updateFeedbackById)
    .delete(adminAuth, adminController.deleteFeedback);

module.exports = router;
