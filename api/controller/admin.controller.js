const { StatusCodes } = require('http-status-codes');
const ClinicMetaData = require('../../model/clinicMetaData');
const CustomerFeedback = require('../../model/customerFeedback');
const Patient = require('../../model/patient');
const Slot = require('../../model/slot');

// Utility function to convert a date to IST
const toIST = (date) => {
  const offset = 5.5 * 60 * 60 * 1000; // IST offset from UTC in milliseconds
  return new Date(date.getTime() + offset);
};

// Clinic meta data
exports.upsertClinicMeta = async (req, res) => {
  try {
    const { bannerUrl, desc, faqs } = req.body;

    if (!bannerUrl || !desc || !desc.title || !desc.body) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Validation failed',
        error: 'Banner URL and description (header and body) are required'
      });
    }

    const existingMeta = await ClinicMetaData.findOne();

    let clinicMetaData;
    if (existingMeta) {
      existingMeta.bannerUrl = bannerUrl;
      existingMeta.desc = desc;
      if (faqs) {
        existingMeta.faqs = faqs;
      }
      clinicMetaData = await existingMeta.save();
    } else {
      clinicMetaData = new ClinicMetaData({
        bannerUrl,
        desc: {
          title: desc.title,
          body: desc.body
        },
        faqs: faqs || []
      });
      await clinicMetaData.save();
    }

    return res.status(StatusCodes.CREATED).send({
      status: 'Clinic meta data upserted successfully',
      data: clinicMetaData
    });
  } catch (e) {
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Upsert failed',
      error: e.message || e
    });
  }
};

exports.updateClinicMetaData = async (req, res) => {
  try {
    const { metaId } = req.params;
    const existingMetaData = await ClinicMetaData.findById(metaId);
    if (!existingMetaData) {
      throw new Error('Clinic meta data not found');
    }
    const { bannerUrl, desc, faqs } = req.body;
    if (bannerUrl) existingMetaData.bannerUrl = bannerUrl;
    if (desc) {
      if (desc.title) existingMetaData.desc.title = desc.title;
      if (desc.body && desc.body.length) {
        existingMetaData.desc.body = [
          ...existingMetaData.desc.body,
          ...desc.body
        ];
      }
    }
    if (faqs && faqs.length) {
      existingMetaData.faqs = [...existingMetaData.faqs, ...faqs];
    }
    await existingMetaData.save();
    return res.status(StatusCodes.CREATED).send({
      status: 'Clinic meta data updated successfully',
      data: existingMetaData
    });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Updatation failed',
      error: err.message || err
    });
  }
};

exports.deleteClinicMeta = async (req, res) => {
  try {
    const { metaId } = req.params;
    const existingMetaData = await ClinicMetaData.findById(metaId);
    if (!existingMetaData) {
      throw new Error('Clinic meta data not found');
    }
    const { descBody, faq } = req.body;
    if (descBody) {
      existingMetaData.desc.body = existingMetaData.desc.body.filter(
        (data) => data !== descBody
      );
    }
    if (faq) {
      existingMetaData.faqs = existingMetaData.faqs.filter(
        (data) => data.id !== faq
      );
    }
    await existingMetaData.save();
    return res.status(StatusCodes.OK).send({
      status: 'Clinic meta data deleted successfully',
      data: existingMetaData
    });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Deletion failed',
      error: err.message || err
    });
  }
};

// CustomerFeedback data
exports.listAllFeedbacks = async (req, res) => {
  try {
    const { name, page = 1, limit = 10 } = req.query;
    let filter = {};

    const pageNumber = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNumber = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const feedbacks = await CustomerFeedback.find(filter)
      .skip(skip)
      .limit(limitNumber);

    const totalFeedbacks = await CustomerFeedback.countDocuments(filter);

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: feedbacks,
      meta: {
        total: totalFeedbacks,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalFeedbacks / limitNumber)
      }
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
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
        error: 'Feedback not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: feedback
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
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
        error: 'Feedback not found'
      });
    }

    if (videoUrls !== undefined) {
      feedback.videoUrls = videoUrls;
    }

    if (typeof isTestimonial === 'boolean') {
      feedback.isTestimonial = isTestimonial;
    }

    await feedback.save();

    return res.status(StatusCodes.OK).send({
      status: 'Feedback updated successfully',
      data: feedback
    });
  } catch (e) {
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Update failed',
      error: e.message || e
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
        error: 'Feedback not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Deleted',
      data: feedback
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Deletion failed',
      error: e.message || e
    });
  }
};

// Appointment
exports.setSchedule = async (req, res) => {
  try {
    const { date, startTime, endTime, breakTime, maxPatientsPerInterval, intervalMinutes } = req.body;

    const slot = new Slot({
      date: toIST(new Date(date)),
      startTime,
      endTime,
      breakTime,
      maxSlots: maxPatientsPerInterval,
    });

    await slot.save();

    res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Schedule set successfully',
      slotId: slot._id
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e,
    });
  }
};

exports.listAppointments = async (req, res) => {
  try {
    const { name, date, page = 1, limit = 10 } = req.query;
    let filter = {};
    let appointmentIds = [];

    const pageNumber = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNumber = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;

    if (date) {
      const selectedDateUTC = new Date(date);
      selectedDateUTC.setUTCHours(0, 0, 0, 0);
      const nextDayUTC = new Date(selectedDateUTC);
      nextDayUTC.setUTCDate(selectedDateUTC.getUTCDate() + 1);

      const slot = await Slot.findOne({
        date: {
          $gte: selectedDateUTC,
          $lt: nextDayUTC
        }
      });

      if (slot) {
        appointmentIds = slot.appointmentIds.map(idObj => idObj._id);
      } else {
        return res.status(StatusCodes.NOT_FOUND).send({
          status: 'Not found',
          message: 'No slots available for the selected date'
        });
      }
    }

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    if (appointmentIds.length > 0) {
      filter._id = { $in: appointmentIds };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const appointments = await Patient.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .sort({ appointmentTime: 1 });

    const totalAppointments = await Patient.countDocuments(filter);

    res.status(StatusCodes.OK).send({
      status: 'Success',
      data: appointments,
      meta: {
        total: totalAppointments,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalAppointments / limitNumber)
      }
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e,
    });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Patient.findById(id);
    if (!appointment) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        message: 'Appointment not found'
      });
    }

    res.status(StatusCodes.OK).send({
      status: 'Success',
      data: appointment
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e,
    });
  }
};

exports.editAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.appointmentTime) {
      updateData.appointmentTime = toIST(new Date(updateData.appointmentTime));
    }

    const appointment = await Patient.findByIdAndUpdate(id, updateData, { new: true });
    if (!appointment) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        message: 'Appointment not found'
      });
    }

    if (updateData.appointmentTime) {
      const oldSlot = await Slot.findOne({ appointmentIds: appointment._id });
      const newSlot = await Slot.findOne({ date: toIST(new Date(updateData.appointmentTime)) });

      if (oldSlot && oldSlot._id.toString() !== newSlot._id.toString()) {
        oldSlot.appointmentIds = oldSlot.appointmentIds.filter(id => id.toString() !== appointment._id.toString());
        await oldSlot.save();

        if (newSlot) {
          newSlot.appointmentIds.push(appointment._id);
          await newSlot.save();
        }
      }
    }

    res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e,
    });
  }
};

exports.deleteAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Patient.findByIdAndDelete(id);
    if (!appointment) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        message: 'Appointment not found'
      });
    }

    await Slot.updateMany(
      { appointmentIds: appointment._id },
      { $pull: { appointmentIds: appointment._id } }
    );

    res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Appointment deleted successfully'
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e,
    });
  }
};
