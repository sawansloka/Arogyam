const { StatusCodes } = require('http-status-codes');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const moment = require('moment-timezone');
const {
  adminSecretKey,
  nonDocSecretKey,
  jwtSecretKey,
  digitalOceanService
} = require('../../config/vars');
const {
  convertToKebabCase,
  convertDateFormat
} = require('../../utils/publicHelper');
const ClinicMetaData = require('../../model/clinicMetaData');
const CustomerFeedback = require('../../model/customerFeedback');
const Patient = require('../../model/patient');
const Slot = require('../../model/slot');
const Admin = require('../../model/admin');
const Prescription = require('../../model/prescription');
// const { uploadPdfToGoogleDrive } = require('../../utils/googleHelper');
const { renderPdf } = require('../../utils/renderFile');
const { uploadToS3 } = require('../../utils/s3');
const ArogyamDiagnosis = require('../../utils/arogyamDiagnosis.json');
const Diagnosis = require('../../model/diagnosis');
const { logger } = require('../../config/logger');

// Clinic meta data
exports.upsertClinicMeta = async (req, res) => {
  try {
    logger.info('Starting upsertClinicMeta function...');
    const { bannerUrl, desc, faqs, schedule } = req.body;

    if (!bannerUrl || !desc || !desc.title || !desc.body) {
      logger.warn(
        'Validation failed: Missing required fields for clinic meta data.'
      );
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Validation failed',
        error: 'Banner URL and description (header and body) are required'
      });
    }

    logger.info('Checking for existing clinic meta data...');
    const existingMeta = await ClinicMetaData.findOne();

    let clinicMetaData;
    if (existingMeta) {
      logger.info('Existing clinic meta data found. Updating...');
      existingMeta.bannerUrl = bannerUrl;
      existingMeta.desc = desc;
      if (faqs) {
        logger.info('Updating FAQs...');
        existingMeta.faqs = faqs;
      }
      if (schedule) {
        logger.info('Updating schedule...');
        if (schedule.startTime) {
          existingMeta.schedule.startTime = schedule.startTime;
        }
        if (schedule.endTime) {
          existingMeta.schedule.endTime = schedule.endTime;
        }
        if (schedule.breakTime && schedule.breakTime.length) {
          existingMeta.schedule.breakTime = schedule.breakTime;
        }
        if (schedule.maxSlots) {
          existingMeta.schedule.maxSlots = schedule.maxSlots;
        }
        if (typeof schedule.isCronJobEnabled === 'boolean') {
          existingMeta.schedule.isCronJobEnabled =
            schedule.isCronJobEnabled || false;
        }
      }

      clinicMetaData = await existingMeta.save();
      logger.info('Clinic meta data updated successfully.');
    } else {
      logger.info('No existing clinic meta data found. Creating new entry...');
      clinicMetaData = new ClinicMetaData({
        bannerUrl,
        desc: {
          title: desc.title,
          body: desc.body
        },
        faqs: faqs || [],
        schedule
      });
      await clinicMetaData.save();
      logger.info('New clinic meta data created successfully.');
    }

    logger.info('upsertClinicMeta function completed successfully.');
    return res.status(StatusCodes.CREATED).send({
      status: 'Clinic meta data upserted successfully',
      data: clinicMetaData
    });
  } catch (e) {
    logger.error('Error in upsertClinicMeta function:', e.message);
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Upsert failed',
      error: e.message || e
    });
  }
};

exports.getClinicMeta = async (req, res) => {
  try {
    logger.info('Fetching clinic meta data...');
    const clinicMetaData = await ClinicMetaData.findOne();

    if (!clinicMetaData) {
      logger.warn('Clinic meta data not found.');
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Clinic meta data not found'
      });
    }

    logger.info('Clinic meta data fetched successfully.');
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: clinicMetaData
    });
  } catch (e) {
    logger.error('Error fetching clinic meta data:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
    });
  }
};

exports.updateClinicMetaData = async (req, res) => {
  try {
    logger.info('Starting updateClinicMetaData function...');
    const { metaId } = req.params;
    logger.info(`Fetching clinic meta data with ID: ${metaId}`);
    const existingMetaData = await ClinicMetaData.findById(metaId);

    if (!existingMetaData) {
      logger.warn(`Clinic meta data not found for ID: ${metaId}`);
      throw new Error('Clinic meta data not found');
    }

    const { filename, title, body, question, answer, schedule } = req.body;

    if (filename) {
      logger.info(`Uploading file: ${filename} to S3 bucket...`);
      const fileBuffer = req.file.buffer;
      await uploadToS3(fileBuffer, filename, digitalOceanService.s3Bucket);
      existingMetaData.bannerUrl = `${digitalOceanService.originUrl}/${filename}`;
      logger.info(`File uploaded successfully. Updated banner URL.`);
    }

    if (title) {
      logger.info('Updating title in clinic meta data...');
      existingMetaData.desc.title = title;
    }

    if (body) {
      logger.info('Adding new body content to clinic meta data...');
      existingMetaData.desc.body = [...existingMetaData.desc.body, body];
    }

    if (question && answer) {
      logger.info('Adding new FAQ to clinic meta data...');
      existingMetaData.faqs = [...existingMetaData.faqs, { question, answer }];
    }

    if (schedule) {
      logger.info('Updating schedule in clinic meta data...');
      if (schedule.startTime) {
        logger.info(`Updating startTime: ${schedule.startTime}`);
        existingMetaData.schedule.startTime = schedule.startTime;
      }
      if (schedule.endTime) {
        logger.info(`Updating endTime: ${schedule.endTime}`);
        existingMetaData.schedule.endTime = schedule.endTime;
      }
      if (schedule.breakTime && schedule.breakTime.length) {
        logger.info('Updating breakTime in schedule...');
        existingMetaData.schedule.breakTime = schedule.breakTime;
      }
      if (schedule.maxSlots) {
        logger.info(`Updating maxSlots: ${schedule.maxSlots}`);
        existingMetaData.schedule.maxSlots = schedule.maxSlots;
      }
      if (typeof schedule.isCronJobEnabled === 'boolean') {
        logger.info(`Updating isCronJobEnabled: ${schedule.isCronJobEnabled}`);
        existingMetaData.schedule.isCronJobEnabled = schedule.isCronJobEnabled;
      }
    }

    logger.info('Saving updated clinic meta data...');
    await existingMetaData.save();
    logger.info('Clinic meta data updated successfully.');

    return res.status(StatusCodes.CREATED).send({
      status: 'Clinic meta data updated successfully',
      data: existingMetaData
    });
  } catch (err) {
    logger.error('Error in updateClinicMetaData function:', err.message);
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Updatation failed',
      error: err.message || err
    });
  }
};

exports.deleteClinicMeta = async (req, res) => {
  try {
    logger.info('Starting deleteClinicMeta function...');
    const { metaId } = req.params;
    logger.info(`Fetching clinic meta data with ID: ${metaId}`);
    const existingMetaData = await ClinicMetaData.findById(metaId);

    if (!existingMetaData) {
      logger.warn(`Clinic meta data not found for ID: ${metaId}`);
      throw new Error('Clinic meta data not found');
    }

    const { descBody, faq } = req.body;

    if (descBody) {
      logger.info(`Deleting body content: ${descBody}`);
      existingMetaData.desc.body = existingMetaData.desc.body.filter(
        (data) => data !== descBody
      );
    }

    if (faq) {
      logger.info(`Deleting FAQ with ID: ${faq}`);
      existingMetaData.faqs = existingMetaData.faqs.filter(
        (data) => data.id !== faq
      );
    }

    logger.info('Saving updated clinic meta data after deletion...');
    await existingMetaData.save();
    logger.info('Clinic meta data deleted successfully.');

    return res.status(StatusCodes.OK).send({
      status: 'Clinic meta data deleted successfully',
      data: existingMetaData
    });
  } catch (err) {
    logger.error('Error in deleteClinicMeta function:', err.message);
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Deletion failed',
      error: err.message || err
    });
  }
};

// CustomerFeedback data
exports.listAllFeedbacks = async (req, res) => {
  try {
    logger.info('Starting listAllFeedbacks function...');
    const { name, page = 1, limit = 10 } = req.query;
    const filter = {};

    const pageNumber = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNumber = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;

    logger.info(
      `Pagination details - Page: ${pageNumber}, Limit: ${limitNumber}`
    );

    if (name) {
      logger.info(`Filtering feedbacks by name: ${name}`);
      filter.name = { $regex: name, $options: 'i' };
    }

    const skip = (pageNumber - 1) * limitNumber;

    logger.info('Fetching feedbacks from the database...');
    const feedbacks = await CustomerFeedback.find(filter)
      .skip(skip)
      .limit(limitNumber);

    const totalFeedbacks = await CustomerFeedback.countDocuments(filter);

    logger.info(`Total feedbacks found: ${totalFeedbacks}`);

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
    logger.error('Error in listAllFeedbacks function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
    });
  }
};

exports.getFeedbackById = async (req, res) => {
  try {
    logger.info('Starting getFeedbackById function...');
    const { id } = req.params;
    logger.info(`Fetching feedback with ID: ${id}`);

    const feedback = await CustomerFeedback.findById(id);

    if (!feedback) {
      logger.warn(`Feedback not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Feedback not found'
      });
    }

    logger.info(`Feedback fetched successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: feedback
    });
  } catch (e) {
    logger.error('Error in getFeedbackById function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
    });
  }
};

exports.updateFeedbackById = async (req, res) => {
  try {
    logger.info('Starting updateFeedbackById function...');
    const { id } = req.params;
    logger.info(`Fetching feedback with ID: ${id}`);
    const { videoUrls, isTestimonial } = req.body;

    const feedback = await CustomerFeedback.findById(id);

    if (!feedback) {
      logger.warn(`Feedback not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Feedback not found'
      });
    }

    if (videoUrls !== undefined) {
      logger.info(`Updating video URLs for feedback ID: ${id}`);
      feedback.videoUrls = videoUrls;
    }

    if (typeof isTestimonial === 'boolean') {
      logger.info(`Updating isTestimonial flag for feedback ID: ${id}`);
      feedback.isTestimonial = isTestimonial;
    }

    logger.info(`Saving updated feedback for ID: ${id}`);
    await feedback.save();

    logger.info(`Feedback updated successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Feedback updated successfully',
      data: feedback
    });
  } catch (e) {
    logger.error('Error in updateFeedbackById function:', e.message);
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Update failed',
      error: e.message || e
    });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    logger.info('Starting deleteFeedback function...');
    const { id } = req.params;
    logger.info(`Attempting to delete feedback with ID: ${id}`);
    const feedback = await CustomerFeedback.findByIdAndDelete(id);

    if (!feedback) {
      logger.warn(`Feedback not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Feedback not found'
      });
    }

    logger.info(`Feedback deleted successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Deleted',
      data: feedback
    });
  } catch (e) {
    logger.error('Error in deleteFeedback function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Deletion failed',
      error: e.message || e
    });
  }
};

// schedule slots
exports.scheduleCronJob = async () => {
  try {
    logger.info('Starting scheduleCronJob function...');
    const clinicMetaData = await ClinicMetaData.findOne({});

    if (clinicMetaData && clinicMetaData.schedule.isCronJobEnabled) {
      logger.info('Cron job is enabled, checking for schedules...');

      const today = moment().tz('Asia/Kolkata');
      logger.info(`Today's date: ${today.toISOString()}`);

      // Calculate the date 15 days ago
      const pastDate = today.clone().subtract(15, 'days');
      pastDate.startOf('day');
      logger.info(`Deleting schedules older than: ${pastDate.toISOString()}`);

      // Delete schedules that are 15 days older than today
      const deletedSlots = await Slot.deleteMany({
        date: { $lt: pastDate }
      });

      if (deletedSlots.deletedCount > 0) {
        logger.info(
          `Cron job deleted ${deletedSlots.deletedCount} schedules older than 15 days.`
        );
      } else {
        logger.info('No schedules found that are older than 15 days.');
      }

      // Find patients with status 'BOOKED' for previous dates
      logger.info('Finding outdated patients with status "BOOKED"...');
      const outdatedPatients = await Patient.find({
        status: 'BOOKED',
        appointmentTime: { $lt: today }
      });

      if (outdatedPatients.length > 0) {
        const patientIds = outdatedPatients.map((patient) => patient._id);
        logger.info(
          `Cron job found ${outdatedPatients.length} outdated patients with status 'BOOKED'. Patient IDs:`,
          patientIds
        );

        // Update their status to 'CANCELLED'
        await Patient.updateMany(
          {
            _id: { $in: patientIds }
          },
          { $set: { status: 'CANCELLED' } }
        );

        logger.info(
          `Cron job updated the status of ${outdatedPatients.length} patients to 'CANCELLED'.`
        );
      } else {
        logger.info('No outdated patients found with status "BOOKED".');
      }

      // Calculate the date for the 7th day from today
      const futureDate = today.clone().add(7, 'days');
      futureDate.startOf('day');
      logger.info(
        `Checking for schedules on the 7th day: ${futureDate.toISOString()}`
      );

      const nextDateUTC = futureDate.clone().add(1, 'days');

      const slotsExist = await Slot.findOne({
        date: {
          $gte: futureDate,
          $lt: nextDateUTC
        }
      });

      if (!slotsExist) {
        logger.info(
          'No schedule exists for the 7th day. Creating a new schedule...'
        );
        const { startTime, endTime, breakTime, maxSlots } =
          clinicMetaData.schedule;

        const slot = new Slot({
          date: futureDate,
          startTime: startTime || '10:00',
          endTime: endTime || '19:00',
          breakTime: breakTime.length
            ? breakTime
            : [{ start: '13:00', end: '14:00' }],
          maxSlots: maxSlots || 3
        });

        await slot.save();
        logger.info('Cron job created a new schedule for the 7th day.');
      } else {
        logger.info(
          'Cron job skipped: Schedule already exists for the 7th day.'
        );
      }
    } else {
      logger.info('Cron job is disabled, stopping the job.');
      job.stop();
    }
  } catch (error) {
    logger.error('Error in scheduleCronJob function:', error.message);
  }
};

let job = cron.schedule('0 0 * * *', this.scheduleCronJob, { scheduled: true });

// Function to manually start or stop the cron job from an API
exports.toggleCronJob = async (req, res) => {
  try {
    logger.info('Starting toggleCronJob function...');
    const { action } = req.body;

    if (!action || !['enable', 'disable'].includes(action)) {
      logger.warn('Invalid action provided for toggling cron job.');
      return res
        .status(400)
        .json({ message: 'Invalid action. Must be "enable" or "disable".' });
    }

    logger.info(
      `Fetching clinic metadata to toggle cron job. Action: ${action}`
    );
    const clinicMetaData = await ClinicMetaData.findOne({});

    if (!clinicMetaData) {
      logger.warn('Clinic metadata not found.');
      return res.status(404).json({ message: 'Clinic metadata not found.' });
    }

    if (action === 'enable') {
      logger.info('Enabling cron job...');
      clinicMetaData.schedule.isCronJobEnabled = true;
      await clinicMetaData.save();
      job.start();
      logger.info('Cron job enabled successfully.');
      return res.status(200).json({ message: 'Cron job enabled.' });
    }

    if (action === 'disable') {
      logger.info('Disabling cron job...');
      clinicMetaData.schedule.isCronJobEnabled = false;
      await clinicMetaData.save();
      job.stop();
      logger.info('Cron job disabled successfully.');
      return res.status(200).json({ message: 'Cron job disabled.' });
    }

    logger.warn('Invalid action provided for cron job.');
    return res.status(400).json({ message: 'Invalid action for cron job.' });
  } catch (error) {
    logger.error('Error toggling cron job:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.setSchedule = async (req, res) => {
  try {
    logger.info('Starting setSchedule function...');
    const { date, startTime, endTime, breakTime, maxPatientsPerInterval } =
      req.body;

    logger.info(
      `Setting schedule with date: ${date}, startTime: ${startTime}, endTime: ${endTime}, breakTime: ${JSON.stringify(
        breakTime
      )}, maxPatientsPerInterval: ${maxPatientsPerInterval}`
    );

    const slot = new Slot({
      date: new Date(date),
      startTime,
      endTime,
      breakTime,
      maxSlots: maxPatientsPerInterval
    });

    await slot.save();
    logger.info('Schedule set successfully.');

    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Schedule set successfully',
      slotId: slot._id
    });
  } catch (e) {
    logger.error('Error in setSchedule function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.listSchedules = async (req, res) => {
  try {
    logger.info('Starting listSchedules function...');
    const { date } = req.query;
    const query = {};

    if (date) {
      logger.info(`Filtering schedules by date: ${date}`);
      const dateStart = new Date(date);
      dateStart.setUTCHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStart);
      dateEnd.setUTCDate(dateStart.getUTCDate() + 1);

      query.date = { $gte: dateStart, $lt: dateEnd };
    }

    logger.info('Fetching schedules from the database...');
    const schedules = await Slot.find(query);

    logger.info(`Found ${schedules.length} schedule(s).`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: schedules
    });
  } catch (e) {
    logger.error('Error in listSchedules function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.getScheduleById = async (req, res) => {
  try {
    logger.info('Starting getScheduleById function...');
    const { id } = req.params;
    logger.info(`Fetching schedule with ID: ${id}`);

    const schedule = await Slot.findById(id);

    if (!schedule) {
      logger.warn(`Schedule not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Schedule not found'
      });
    }

    logger.info(`Schedule fetched successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: schedule
    });
  } catch (e) {
    logger.error('Error in getScheduleById function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    logger.info('Starting updateSchedule function...');
    const { id } = req.params;
    logger.info(`Updating schedule with ID: ${id}`);
    const updateData = req.body;

    logger.info('Updating schedule data in the database...');
    const updatedSlot = await Slot.findByIdAndUpdate(id, updateData, {
      new: true
    });

    if (!updatedSlot) {
      logger.warn(`Schedule not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Schedule not found'
      });
    }

    logger.info(`Schedule updated successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Schedule updated successfully',
      data: updatedSlot
    });
  } catch (e) {
    logger.error('Error in updateSchedule function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    logger.info('Starting deleteSchedule function...');
    const { id } = req.params;
    logger.info(`Attempting to delete schedule with ID: ${id}`);

    const deletedSlot = await Slot.findByIdAndDelete(id);

    if (!deletedSlot) {
      logger.warn(`Schedule not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Schedule not found'
      });
    }

    logger.info(`Schedule deleted successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Schedule deleted successfully'
    });
  } catch (e) {
    logger.error('Error in deleteSchedule function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.listAppointments = async (req, res) => {
  try {
    logger.info('Starting listAppointments function...');
    const { name, date, page = 1, limit = 10 } = req.query;
    const filter = {};
    let appointmentIds = [];

    const pageNumber = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNumber = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;

    logger.info(
      `Pagination details - Page: ${pageNumber}, Limit: ${limitNumber}`
    );

    if (date) {
      const selectedDateUTC = moment.tz(`${date}T00:00:00`, 'Asia/Kolkata');
      selectedDateUTC.startOf('day');
      const nextDayUTC = selectedDateUTC.clone().add(1, 'days');

      logger.info(
        `Filtering appointments by date from ${selectedDateUTC} to ${nextDayUTC}`
      );

      const slot = await Slot.findOne({
        date: {
          $gte: selectedDateUTC,
          $lt: nextDayUTC
        }
      });

      if (slot) {
        logger.info(
          `Found slot for the selected date. Extracting appointment IDs.`
        );
        appointmentIds = slot.appointmentIds.map((idObj) => idObj._id);
      } else {
        logger.warn('No slots available for the selected date.');
        return res.status(StatusCodes.NOT_FOUND).send({
          status: 'Not found',
          message: 'No slots available for the selected date'
        });
      }
    }

    if (name) {
      logger.info(`Filtering appointments by name: ${name}`);
      filter.name = { $regex: name, $options: 'i' };
    }

    logger.info(`Filtering appointments by extracted IDs. ${appointmentIds}`);
    filter._id = { $in: appointmentIds };

    const skip = (pageNumber - 1) * limitNumber;

    logger.info(
      `Fetching appointments from the database with filter ${JSON.stringify(filter)}...`
    );
    const appointments = await Patient.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .sort({ appointmentTime: 1 });

    const totalAppointments = await Patient.countDocuments(filter);

    logger.info(`Total appointments found: ${totalAppointments}`);
    return res.status(StatusCodes.OK).send({
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
    logger.error('Error in listAppointments function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    logger.info('Starting getAppointmentById function...');
    const { id } = req.params;
    logger.info(`Fetching appointment with ID: ${id}`);

    const appointment = await Patient.findById(id);

    if (!appointment) {
      logger.warn(`Appointment not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        message: 'Appointment not found'
      });
    }

    logger.info(`Appointment fetched successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: appointment
    });
  } catch (e) {
    logger.error('Error in getAppointmentById function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.editAppointmentById = async (req, res) => {
  try {
    logger.info('Starting editAppointmentById function...');
    const { id } = req.params;
    logger.info(`Editing appointment with ID: ${id}`);
    const updateData = req.body;

    if (updateData.appointmentTime) {
      logger.info(
        `Updating appointment time to: ${updateData.appointmentTime}`
      );
      updateData.appointmentTime = new Date(updateData.appointmentTime);
    }

    const appointment = await Patient.findByIdAndUpdate(id, updateData, {
      new: true
    });
    if (!appointment) {
      logger.warn(`Appointment not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        message: 'Appointment not found'
      });
    }

    if (updateData.appointmentTime) {
      logger.info('Handling slot reassignment for updated appointment time...');
      const selectedDateUTC = new Date(updateData.appointmentTime);
      selectedDateUTC.setUTCHours(0, 0, 0, 0);
      const nextDayUTC = new Date(selectedDateUTC);
      nextDayUTC.setUTCDate(selectedDateUTC.getUTCDate() + 1);

      const oldSlot = await Slot.findOne({
        appointmentIds: { $elemMatch: { _id: appointment._id } }
      });

      const newSlot = await Slot.findOne({
        date: {
          $gte: selectedDateUTC,
          $lt: nextDayUTC
        }
      });

      if (
        oldSlot &&
        newSlot &&
        oldSlot._id.toString() !== newSlot._id.toString()
      ) {
        logger.info(
          `Reassigning appointment from old slot ID: ${oldSlot._id} to new slot ID: ${newSlot._id}`
        );
        oldSlot.appointmentIds = oldSlot.appointmentIds.filter(
          (slotId) => slotId._id.toString() !== appointment._id.toString()
        );
        await oldSlot.save();

        newSlot.appointmentIds.push({ _id: appointment._id });
        await newSlot.save();
        logger.info('Slot reassignment completed successfully.');
      } else {
        logger.info('No slot reassignment needed.');
      }
    }

    logger.info(`Appointment updated successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (e) {
    logger.error('Error in editAppointmentById function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.deleteAppointmentById = async (req, res) => {
  try {
    logger.info('Starting deleteAppointmentById function...');
    const { id } = req.params;
    logger.info(`Attempting to delete appointment with ID: ${id}`);

    const appointment = await Patient.findByIdAndDelete(id);
    if (!appointment) {
      logger.warn(`Appointment not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        message: 'Appointment not found'
      });
    }

    logger.info(
      `Removing appointment ID: ${appointment._id} from associated slots...`
    );
    await Slot.updateMany(
      { appointmentIds: appointment._id },
      { $pull: { appointmentIds: appointment._id } }
    );

    logger.info(`Appointment deleted successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Appointment deleted successfully'
    });
  } catch (e) {
    logger.error('Error in deleteAppointmentById function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

// Sign Up
exports.signUp = async (req, res) => {
  try {
    logger.info('Starting signUp function...');
    const { name, email, password, phone, key } = req.body;

    if (!name || !email || !password || !phone || !key) {
      logger.warn('Validation failed: Missing required fields for sign-up.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'All fields are required'
      });
    }

    const isDoctor = key.toString() === adminSecretKey.toString();
    if (!isDoctor && key.toString() !== nonDocSecretKey.toString()) {
      logger.warn('Invalid key provided for sign-up.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Provide valid key'
      });
    }

    logger.info(`Checking if admin with email ${email} already exists...`);
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      logger.warn(`Admin with email ${email} already exists.`);
      return res.status(StatusCodes.CONFLICT).send({
        status: 'Error',
        message: 'Admin with this email already exists'
      });
    }

    logger.info('Creating new admin...');
    const admin = new Admin({ name, email, password, phone, isDoctor });
    await admin.save();

    logger.info('Generating authentication token for the new admin...');
    const token = await admin.generateAuthToken();

    logger.info('Admin created successfully.');
    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Admin created successfully',
      admin: admin.toJSON(),
      token
    });
  } catch (error) {
    logger.error('Error in signUp function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

// Login API
exports.login = async (req, res) => {
  try {
    logger.info('Starting login function...');
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Validation failed: Missing email or password for login.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Please provide email and password'
      });
    }

    logger.info(`Authenticating admin with email: ${email}`);
    const admin = await Admin.findByCredentials(email, password);

    logger.info('Generating authentication token for the admin...');
    const token = await admin.generateAuthToken();

    logger.info('Admin logged in successfully.');
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Admin logged in successfully',
      admin: admin.toJSON(),
      token
    });
  } catch (error) {
    logger.error('Error in login function:', error.message);
    return res.status(StatusCodes.UNAUTHORIZED).send({
      status: 'Error',
      message: error.message || 'Invalid credentials'
    });
  }
};

// Sign Out API for Admin
exports.logout = async (req, res) => {
  try {
    logger.info('Starting logout function...');
    logger.info(`Logging out admin with ID: ${req.user._id}`);

    req.user.tokens = req.user.tokens.filter(
      (tokenObj) => tokenObj.token !== req.token
    );
    await req.user.save();

    logger.info('Admin logged out successfully.');
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Admin logged out successfully'
    });
  } catch (error) {
    logger.error('Error in logout function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

// Forgot Password API
exports.forgotPassword = async (req, res) => {
  try {
    logger.info('Starting forgotPassword function...');
    const { phone, key, newPassword } = req.body;

    if (!phone || !key || !newPassword) {
      logger.warn('Validation failed: Missing phone, key, or new password.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Phone, key, and new password are required'
      });
    }

    if (key.toString() !== adminSecretKey.toString()) {
      logger.warn('Invalid key provided for password reset.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Provide valid key'
      });
    }

    logger.info(`Searching for admin with phone: ${phone}`);
    const admin = await Admin.findOne({ phone });
    if (!admin) {
      logger.warn(`Admin with phone number ${phone} does not exist.`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Admin with this phone number does not exist'
      });
    }

    logger.info(`Updating password for admin with phone: ${phone}`);
    admin.password = newPassword;
    await admin.save();

    logger.info('Password updated successfully.');
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Error in forgotPassword function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.jwtValidate = async (req, res) => {
  try {
    logger.info('Starting jwtValidate function...');
    const token = req.header('Authorization').replace('Bearer ', '');
    logger.info('Decoding JWT token...');
    const decoded = jwt.verify(token, jwtSecretKey);

    logger.info(`Searching for admin with ID: ${decoded._id}`);
    const admin = await Admin.findOne({
      _id: decoded._id,
      'tokens.token': token
    });

    if (!admin) {
      logger.warn('Token is not valid. Admin not found.');
      return res.status(StatusCodes.UNAUTHORIZED).send({
        status: 'Error',
        message: 'Token is not valid'
      });
    }

    logger.info('Token validated successfully.');
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Token validated successfully'
    });
  } catch (err) {
    logger.error('Error in jwtValidate function:', err.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: err.message || 'Internal Server Error'
    });
  }
};

exports.createPrescription = async (req, res) => {
  try {
    logger.info('Starting createPrescription function...');
    const { patientId } = req.body.patient;

    logger.info(`Searching for patient with ID: ${patientId}`);
    const patient = await Patient.findOne({ patientId });

    if (!patient) {
      logger.warn(`Patient not found with ID: ${patientId}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Patient not found'
      });
    }

    logger.info(
      `Found patient with ID: ${patientId}. Adding patient details to prescription.`
    );
    req.body.patient.name = patient.name;
    req.body.patient.phone = patient.phone;

    logger.info('Creating new prescription...');
    const prescription = new Prescription(req.body);
    await prescription.save();

    logger.info('Fetching updated prescription list for the patient...');
    const prescriptionList = await Prescription.find({
      'patient.patientId': patientId
    })
      .sort({ createdDate: -1 })
      .exec();

    logger.info('Prescription created successfully.');
    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Prescription created successfully',
      data: giveGenericPatientResponse(patient, prescriptionList)
    });
  } catch (error) {
    logger.error('Error in createPrescription function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.getAllPrescriptions = async (req, res) => {
  try {
    logger.info('Starting getAllPrescriptions function...');
    const { patientId, startDate, endDate, page = 1, limit = 10 } = req.query;

    logger.info('Building query for fetching prescriptions...');
    const query = {};
    if (patientId) {
      logger.info(`Filtering prescriptions by patientId: ${patientId}`);
      query['patient.patientId'] = patientId;
    }
    if (startDate || endDate) {
      query.followUpDate = {};
      if (startDate) {
        logger.info(`Filtering prescriptions with startDate: ${startDate}`);
        query.followUpDate.$gte = new Date(startDate);
      }
      if (endDate) {
        logger.info(`Filtering prescriptions with endDate: ${endDate}`);
        query.followUpDate.$lte = new Date(endDate);
      }
    }

    logger.info(
      `Fetching prescriptions with pagination - Page: ${page}, Limit: ${limit}`
    );
    const prescriptions = await Prescription.find(query)
      .populate('patient.patientId')
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    const totalCount = await Prescription.countDocuments(query);
    logger.info(`Total prescriptions found: ${totalCount}`);

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescriptions fetched successfully',
      data: prescriptions,
      pagination: {
        totalCount,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalCount / limit),
        limit: parseInt(limit, 10)
      }
    });
  } catch (error) {
    logger.error('Error in getAllPrescriptions function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.getPrescriptionById = async (req, res) => {
  try {
    logger.info('Starting getPrescriptionById function...');
    const { id } = req.params;
    logger.info(`Fetching prescription with ID: ${id}`);

    const prescription = await Prescription.findById(id);

    if (!prescription) {
      logger.warn(`Prescription not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    logger.info(`Prescription fetched successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescription fetched successfully',
      data: prescription
    });
  } catch (error) {
    logger.error('Error in getPrescriptionById function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.updatePrescription = async (req, res) => {
  try {
    logger.info('Starting updatePrescription function...');
    const { id } = req.params;
    logger.info(`Updating prescription with ID: ${id}`);

    const prescription = await Prescription.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!prescription) {
      logger.warn(`Prescription not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    logger.info(
      `Fetching patient details for patientId: ${prescription.patient.patientId}`
    );
    const patient = await Patient.findOne({
      patientId: prescription.patient.patientId
    });
    if (!patient) {
      logger.error(
        `Patient not found for patientId: ${prescription.patient.patientId}`
      );
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        status: 'Error',
        message: 'Patient not found'
      });
    }

    logger.info(
      `Fetching updated prescription list for patientId: ${prescription.patient.patientId}`
    );
    const prescriptionList = await Prescription.find({
      'patient.patientId': prescription.patient.patientId
    })
      .sort({ createdDate: -1 })
      .exec();

    logger.info(`Prescription updated successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescription updated successfully',
      data: giveGenericPatientResponse(patient, prescriptionList)
    });
  } catch (error) {
    logger.error('Error in updatePrescription function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.deletePrescription = async (req, res) => {
  try {
    logger.info('Starting deletePrescription function...');
    const { id } = req.params;
    logger.info(`Attempting to delete prescription with ID: ${id}`);

    const prescription = await Prescription.findByIdAndDelete(id);

    if (!prescription) {
      logger.warn(`Prescription not found for ID: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    logger.info(`Prescription deleted successfully for ID: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescription deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deletePrescription function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.generatePrescriptionPDF = async (req, res) => {
  try {
    logger.info('Starting generatePrescriptionPDF function...');
    const { patientId } = req.body;
    logger.info(`Fetching prescription for patientId: ${patientId}`);

    const prescription = await Prescription.findOne({
      'patient.patientId': patientId
    });

    if (!prescription) {
      logger.warn(`Prescription not found for patientId: ${patientId}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    const { patient } = prescription;
    logger.info(`Fetching patient details for patientId: ${patient.patientId}`);
    const existingPatient = await Patient.findOne({
      patientId: patient.patientId
    });

    if (
      existingPatient.prescription.url &&
      existingPatient.prescription.date.startsWith(new Date())
    ) {
      logger.warn(
        `Prescription for the current date has already been generated for patientId: ${patient.patientId}`
      );
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Prescription for the current date has already been generated.'
      });
    }

    logger.info('Generating PDF buffer for the prescription...');
    const pdfBuffer = await renderPdf(
      'src/views/prescription.ejs',
      prescription
    );

    let count = existingPatient.visitedPrescriptionUrls
      ? existingPatient.visitedPrescriptionUrls.length + 1
      : 1;
    count = existingPatient.prescription.url ? (count += 1) : 1;

    const fileName = `${patient.patientId}-${convertToKebabCase(
      patient.name
    )}-${count}-${convertDateFormat(
      new Date().toLocaleDateString()
    )}-prescription.pdf`;

    logger.info(`Uploading PDF to S3 with file name: ${fileName}`);
    await uploadToS3(
      pdfBuffer,
      fileName,
      digitalOceanService.s3Bucket,
      digitalOceanService.prescriptionFolder
    );
    const prescriptionUrl = `${digitalOceanService.originUrl}/${digitalOceanService.prescriptionFolder}/${fileName}`;
    logger.info(`PDF uploaded successfully. URL: ${prescriptionUrl}`);

    if (existingPatient.prescription.url) {
      logger.info('Archiving previous prescription URL...');
      existingPatient.visitedPrescriptionUrls.push({
        url: existingPatient.prescription.url,
        date: existingPatient.prescription.date
      });
    }

    existingPatient.prescription = {
      url: prescriptionUrl,
      date: new Date()
    };

    await existingPatient.save();
    logger.info('Prescription details updated successfully for the patient.');

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'PDF generated successfully',
      pdfLink: prescriptionUrl
    });
  } catch (error) {
    logger.error('Error in generatePrescriptionPDF function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.downloadPrescription = async (req, res) => {
  try {
    logger.info('Starting downloadPrescription function...');
    const { patientId } = req.query;
    logger.info(`Fetching prescription for patientId: ${patientId}`);

    const prescription = await Prescription.findOne({
      'patient.patientId': patientId
    });

    const existingPatient = await Patient.findOne({
      patientId
    });

    if (
      !prescription ||
      !existingPatient ||
      !existingPatient.prescription ||
      !existingPatient.prescription.url
    ) {
      logger.warn(`Prescription not found for patientId: ${patientId}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    const pdfLink = existingPatient.prescription.url;
    logger.info(`Downloading PDF from URL: ${pdfLink}`);
    const response = await axios.get(pdfLink, { responseType: 'arraybuffer' });

    logger.info('PDF downloaded successfully.');
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'PDF downloaded successfully',
      pdfBuffer: response.data
    });
  } catch (error) {
    logger.error('Error in downloadPrescription function:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.getPatientData = async (req, res) => {
  try {
    logger.info('Starting getPatientData function...');
    const { id } = req.params;
    logger.info(`Fetching patient data for patientId: ${id}`);

    const prescription = await Prescription.find({
      'patient.patientId': id
    })
      .sort({ createdDate: -1 })
      .exec();

    const patient = await Patient.findOne({ patientId: id });

    if (!patient) {
      logger.warn(`Patient not found for patientId: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Patient not found'
      });
    }

    logger.info(`Patient data fetched successfully for patientId: ${id}`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Patient found successfully',
      data: giveGenericPatientResponse(patient, prescription)
    });
  } catch (err) {
    logger.error('Error in getPatientData function:', err.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: err.message || 'Internal Server Error'
    });
  }
};

// Diagnosis
exports.getArogyamDiagnosis = async (req, res) => {
  try {
    logger.info('Starting getArogyamDiagnosis function...');
    const arogyamDiagnosis = ArogyamDiagnosis;

    if (!arogyamDiagnosis) {
      logger.warn('Arogyam diagnosis data not found.');
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Arogyam diagnosis data not found'
      });
    }

    logger.info('Arogyam diagnosis data fetched successfully.');
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: arogyamDiagnosis
    });
  } catch (e) {
    logger.error('Error in getArogyamDiagnosis function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
    });
  }
};

exports.createDiagnosis = async (req, res) => {
  try {
    logger.info('Starting createDiagnosis function...');
    const { patientId, sections } = req.body;
    logger.info(`Fetching patient with patientId: ${patientId}`);

    const patient = await Patient.findOne({ patientId });

    if (!patient) {
      logger.warn(`Patient not found for patientId: ${patientId}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Patient not found'
      });
    }

    logger.info('Creating new diagnosis data...');
    const diagnosis = new Diagnosis({ patientId, sections });
    await diagnosis.save();

    logger.info('Diagnosis data created successfully.');
    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Diagnosis data created successfully',
      data: diagnosis
    });
  } catch (e) {
    logger.error('Error in createDiagnosis function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Creation failed',
      error: e.message || e
    });
  }
};

exports.updateDiagnosis = async (req, res) => {
  try {
    logger.info('Starting updateDiagnosis function...');
    const { patientId, sections } = req.body;
    logger.info(`Fetching patient with patientId: ${patientId}`);

    const patient = await Patient.findOne({ patientId });

    if (!patient) {
      logger.warn(`Patient not found for patientId: ${patientId}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Patient not found'
      });
    }

    logger.info('Updating diagnosis data...');
    const diagnosis = await Diagnosis.findOneAndUpdate(
      {
        patientId
      },
      {
        sections
      },
      {
        new: true
      }
    );

    logger.info('Diagnosis data updated successfully.');
    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Diagnosis data updated successfully',
      data: diagnosis
    });
  } catch (e) {
    logger.error('Error in updateDiagnosis function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Creation failed',
      error: e.message || e
    });
  }
};

exports.getDiagnosis = async (req, res) => {
  try {
    logger.info('Starting getDiagnosis function...');
    const patientId = req.params.id;
    logger.info(`Fetching diagnosis for patientId: ${patientId}`);

    const diagnosis = await Diagnosis.findOne({ patientId });

    if (!diagnosis) {
      logger.warn(`No diagnosis found for patientId: ${patientId}`);
      return res.status(404).send({
        status: 'Error',
        message: `No diagnosis found for patientId: ${patientId}`
      });
    }

    logger.info(
      `Diagnosis data fetched successfully for patientId: ${patientId}`
    );
    return res.status(200).send({
      status: 'Success',
      message: 'Diagnosis data fetched successfully',
      data: diagnosis
    });
  } catch (error) {
    logger.error('Error in getDiagnosis function:', error.message);
    return res.status(500).send({
      status: 'Error',
      message: error.message || 'Failed to fetch diagnosis.'
    });
  }
};

const giveGenericPatientResponse = (patient, prescription) => {
  const { visitedAppointmentTime } = patient;
  if (!prescription || !prescription.length) {
    return {
      patientCode: 'NEW_PATIENT',
      patient: {
        name: patient.name,
        phone: patient.phone,
        patientId: patient.patientId
      },
      appointmentId: patient._id,
      appointmentStatus: patient.status
    };
  }
  if (visitedAppointmentTime.length <= prescription.length) {
    return {
      patientCode:
        visitedAppointmentTime.length === prescription.length
          ? 'FOLLOW_UP_PATIENT'
          : 'INPROGRESS_PATIENT',
      patient: {
        ...prescription[0].patient
      },
      ...(visitedAppointmentTime.length < prescription.length && {
        diagnosis: prescription[0].diagnosis,
        complaints: prescription[0].complaints,
        findings: prescription[0].findings,
        advice: prescription[0].advice,
        prescriptionItems: prescription[0].prescriptionItems,
        followUpDate: prescription[0].followUpDate,
        prescriptionId: prescription[0]._id
      }),
      appointmentId: patient._id,
      appointmentStatus: patient.status
    };
  }
};
