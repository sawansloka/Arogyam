const StatusCodes = require('http-status-codes').StatusCodes;
const ClinicMetaData = require('../../model/clinicMetaData');
const CustomerFeedback = require('../../model/customerFeedback');

//Clinic meta data
exports.upsertClinicMeta = async (req, res) => {
  try {
    const { bannerUrl, desc, faqs } = req.body;

    // Validate required fields
    if (!bannerUrl || !desc || !desc.title || !desc.body) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Validation failed',
        error: 'Banner URL and description (header and body) are required',
      });
    }

    // Find existing meta data
    const existingMeta = await ClinicMetaData.findOne();

    let clinicMetaData;
    if (existingMeta) {
      // Update existing meta data
      existingMeta.bannerUrl = bannerUrl;
      existingMeta.desc = desc;
      if (faqs) {
        existingMeta.faqs = faqs;
      }
      clinicMetaData = await existingMeta.save();
    } else {
      // Create new meta data
      clinicMetaData = new ClinicMetaData({
        bannerUrl,
        desc: {
          header: desc.header,
          body: desc.body
        },
        faqs: faqs || [] // Default to empty array if no faqs provided
      });
      await clinicMetaData.save();
    }

    res.status(StatusCodes.CREATED).send({
      status: 'Clinic meta data upserted successfully',
      data: clinicMetaData,
    });
  } catch (e) {
    res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Upsert failed',
      error: e.message || e,
    });
  }
};


//CustomerFeedback data
exports.listAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await CustomerFeedback.find();

    res.status(StatusCodes.OK).send({
      status: 'Success',
      data: feedbacks,
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e,
    });
  }
};

exports.getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await CustomerFeedback.findById(id);

    if (!feedback) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Feedback not found',
      });
    }

    res.status(StatusCodes.OK).send({
      status: 'Success',
      data: feedback,
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e,
    });
  }
};

exports.updateFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    const { videoUrls, isTestimonial } = req.body;

    const feedback = await CustomerFeedback.findById(id);

    if (!feedback) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Feedback not found',
      });
    }

    if (videoUrls !== undefined) {
      feedback.videoUrls = videoUrls;
    }

    if (typeof isTestimonial === 'boolean') {
      feedback.isTestimonial = isTestimonial;
    }

    await feedback.save();

    res.status(StatusCodes.OK).send({
      status: 'Feedback updated successfully',
      data: feedback,
    });
  } catch (e) {
    res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Update failed',
      error: e.message || e,
    });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await CustomerFeedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Feedback not found',
      });
    }

    res.status(StatusCodes.OK).send({
      status: 'Deleted',
      data: feedback,
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Deletion failed',
      error: e.message || e,
    });
  }
};

