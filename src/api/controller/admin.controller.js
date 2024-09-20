const { StatusCodes } = require('http-status-codes');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const {
  adminSecretKey,
  nonDocSecretKey,
  jwtSecretKey,
  digitalOceanService
} = require('../../config/vars');
const { toIST } = require('../../utils/publicHelper');
const ClinicMetaData = require('../../model/clinicMetaData');
const CustomerFeedback = require('../../model/customerFeedback');
const Patient = require('../../model/patient');
const Slot = require('../../model/slot');
const Admin = require('../../model/admin');
const Prescription = require('../../model/prescription');
const { uploadPdfToGoogleDrive } = require('../../utils/googleHelper');
const { renderPdf } = require('../../utils/renderFile');
const { uploadToS3 } = require('../../utils/s3');

// Clinic meta data
exports.upsertClinicMeta = async (req, res) => {
  try {
    const { bannerUrl, desc, faqs, schedule } = req.body;

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
      if (schedule) {
        if (schedule.startTime)
          existingMeta.schedule.startTime = schedule.startTime;
        if (schedule.endTime) existingMeta.schedule.endTime = schedule.endTime;

        if (schedule.breakTime && schedule.breakTime.length) {
          existingMeta.schedule.breakTime = schedule.breakTime;
        }

        if (schedule.maxSlots)
          existingMeta.schedule.maxSlots = schedule.maxSlots;

        if (typeof schedule.isCronJobEnabled === 'boolean') {
          existingMeta.schedule.isCronJobEnabled =
            schedule.isCronJobEnabled || false;
        }
      }

      clinicMetaData = await existingMeta.save();
    } else {
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

exports.getClinicMeta = async (req, res) => {
  try {
    const clinicMetaData = await ClinicMetaData.findOne();

    if (!clinicMetaData) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        error: 'Clinic meta data not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: clinicMetaData
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
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
    const { filename, title, body, question, answer, schedule } = req.body;
    if (filename) {
      const fileBuffer = req.file.buffer;
      await uploadToS3(fileBuffer, filename);
      existingMetaData.bannerUrl = `${digitalOceanService.originUrl}/${filename}`;
    }
    if (title) existingMetaData.desc.title = title;
    if (body) {
      existingMetaData.desc.body = [...existingMetaData.desc.body, body];
    }
    if (question && answer) {
      existingMetaData.faqs = [...existingMetaData.faqs, { question, answer }];
    }

    if (schedule) {
      if (schedule.startTime)
        existingMetaData.schedule.startTime = schedule.startTime;
      if (schedule.endTime)
        existingMetaData.schedule.endTime = schedule.endTime;

      if (schedule.breakTime && schedule.breakTime.length) {
        existingMetaData.schedule.breakTime = schedule.breakTime;
      }

      if (schedule.maxSlots)
        existingMetaData.schedule.maxSlots = schedule.maxSlots;

      if (typeof schedule.isCronJobEnabled === 'boolean') {
        existingMetaData.schedule.isCronJobEnabled = schedule.isCronJobEnabled;
      }
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
    const filter = {};

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

// schedule slots
const scheduleCronJob = async () => {
  try {
    const clinicMetaData = await ClinicMetaData.findOne({});

    if (clinicMetaData && clinicMetaData.schedule.isCronJobEnabled) {
      console.log('Cron job is enabled, checking for schedules...');

      const today = new Date();

      // Calculate the date 15 days ago
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 15);
      pastDate.setUTCHours(0, 0, 0, 0);

      // Delete schedules that are 15 days older than today
      const deletedSlots = await Slot.deleteMany({
        date: { $lt: pastDate }
      });

      if (deletedSlots.deletedCount > 0) {
        console.log(
          `Cron job deleted ${deletedSlots.deletedCount} schedules older than 15 days.`
        );
      } else {
        console.log('No schedules found that are older than 15 days.');
      }

      // Calculate the date for the 7th day from today
      const futureDate = new Date(today.setDate(today.getDate() + 7));
      futureDate.setUTCHours(0, 0, 0, 0);

      const nextDateUTC = new Date(futureDate);
      nextDateUTC.setUTCDate(nextDateUTC.getUTCDate() + 1);

      const slotsExist = await Slot.findOne({
        date: {
          $gte: futureDate,
          $lt: nextDateUTC
        }
      });

      if (!slotsExist) {
        const { startTime, endTime, breakTime, maxSlots } =
          clinicMetaData.schedule;

        const slot = new Slot({
          date: futureDate,
          startTime: startTime || '09:00',
          endTime: endTime || '17:00',
          breakTime: breakTime.length
            ? breakTime
            : [{ start: '12:00', end: '13:00' }],
          maxSlots: maxSlots || 3
        });

        await slot.save();
        console.log('Cron job created a new schedule for the 7th day.');
      } else {
        console.log(
          'Cron job skipped: Schedule already exists for the 7th day.'
        );
      }
    } else {
      console.log('Cron job is disabled, stopping the job.');
      job.stop();
    }
  } catch (error) {
    console.error('Error in cron job:', error.message);
  }
};

let job = cron.schedule('0 0 * * *', scheduleCronJob, { scheduled: true });

// Function to manually start or stop the cron job from an API
exports.toggleCronJob = async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || !['enable', 'disable'].includes(action)) {
      return res
        .status(400)
        .json({ message: 'Invalid action. Must be "enable" or "disable".' });
    }

    const clinicMetaData = await ClinicMetaData.findOne({});

    if (!clinicMetaData) {
      return res.status(404).json({ message: 'Clinic metadata not found.' });
    }

    if (action === 'enable') {
      clinicMetaData.schedule.isCronJobEnabled = true;
      await clinicMetaData.save();
      job.start();
      console.log('Cron job enabled.');
      return res.status(200).json({ message: 'Cron job enabled.' });
    }
    if (action === 'disable') {
      clinicMetaData.schedule.isCronJobEnabled = false;
      await clinicMetaData.save();
      job.stop();
      console.log('Cron job disabled.');
      return res.status(200).json({ message: 'Cron job disabled.' });
    }
    return res.status(400).json({ message: 'Invalid action for cron job.' });
  } catch (error) {
    console.error('Error toggling cron job:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.setSchedule = async (req, res) => {
  try {
    const { date, startTime, endTime, breakTime, maxPatientsPerInterval } =
      req.body;

    const slot = new Slot({
      date: toIST(new Date(date)),
      startTime,
      endTime,
      breakTime,
      maxSlots: maxPatientsPerInterval
    });

    await slot.save();

    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Schedule set successfully',
      slotId: slot._id
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.listSchedules = async (req, res) => {
  try {
    const { date } = req.query;
    const query = {};

    if (date) {
      const dateStart = new Date(date);
      dateStart.setUTCHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStart);
      dateEnd.setUTCDate(dateStart.getUTCDate() + 1);

      query.date = { $gte: dateStart, $lt: dateEnd };
    }

    const schedules = await Slot.find(query);

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: schedules
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Slot.findById(id);

    if (!schedule) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Schedule not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: schedule
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedSlot = await Slot.findByIdAndUpdate(id, updateData, {
      new: true
    });

    if (!updatedSlot) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Schedule not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Schedule updated successfully',
      data: updatedSlot
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSlot = await Slot.findByIdAndDelete(id);

    if (!deletedSlot) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Schedule not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Schedule deleted successfully'
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

// Appointment Booking
exports.listAppointments = async (req, res) => {
  try {
    const { name, date, page = 1, limit = 10 } = req.query;
    const filter = {};
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
        appointmentIds = slot.appointmentIds.map((idObj) => idObj._id);
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
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
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

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: appointment
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.editAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.appointmentTime) {
      updateData.appointmentTime = new Date(updateData.appointmentTime);
    }

    const appointment = await Patient.findByIdAndUpdate(id, updateData, {
      new: true
    });
    if (!appointment) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Not found',
        message: 'Appointment not found'
      });
    }

    if (updateData.appointmentTime) {
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
        oldSlot.appointmentIds = oldSlot.appointmentIds.filter(
          (slotId) => slotId._id.toString() !== appointment._id.toString()
        );
        await oldSlot.save();

        newSlot.appointmentIds.push({ _id: appointment._id });
        await newSlot.save();
      }
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
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

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Appointment deleted successfully'
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

// Sign Up
exports.signUp = async (req, res) => {
  try {
    const { name, email, password, phone, key } = req.body;

    if (!name || !email || !password || !phone || !key) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'All fields are required'
      });
    }

    const isDoctor = key.toString() === adminSecretKey.toString();
    if (!isDoctor && key.toString() !== nonDocSecretKey.toString()) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Provide valid key'
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(StatusCodes.CONFLICT).send({
        status: 'Error',
        message: 'Admin with this email already exists'
      });
    }

    const admin = new Admin({ name, email, password, phone, isDoctor });

    await admin.save();

    const token = await admin.generateAuthToken();

    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Admin created successfully',
      admin: admin.toJSON(),
      token
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

// Login API
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Please provide email and password'
      });
    }

    const admin = await Admin.findByCredentials(email, password);

    const token = await admin.generateAuthToken();

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Admin logged in successfully',
      admin: admin.toJSON(),
      token
    });
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).send({
      status: 'Error',
      message: error.message || 'Invalid credentials'
    });
  }
};

// Sign Out API for Admin
exports.logout = async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      (tokenObj) => tokenObj.token !== req.token
    );
    await req.user.save();

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Admin logged out successfully'
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

// Forgot Password API
exports.forgotPassword = async (req, res) => {
  try {
    const { phone, key, newPassword } = req.body;

    if (!phone || !key || !newPassword) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Phone, key, and new password are required'
      });
    }

    if (key.toString() !== adminSecretKey.toString()) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Provide valid key'
      });
    }

    const admin = await Admin.findOne({ phone });
    if (!admin) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Admin with this phone number does not exist'
      });
    }

    admin.password = newPassword;
    await admin.save();

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.jwtValidate = async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, jwtSecretKey);
    const admin = await Admin.findOne({
      _id: decoded._id,
      'tokens.token': token
    });
    if (!admin) {
      return res.status(StatusCodes.UNAUTHORIZED).send({
        status: 'Error',
        message: 'Token is not valid'
      });
    }
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Token validated successfully'
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: err.message || 'Internal Server Error'
    });
  }
};

// Patient Prescription
exports.createPrescription = async (req, res) => {
  try {
    const { patientId } = req.body.patient;

    const patient = await Patient.findOne({ patientId });

    req.body.patient.name = patient.name;
    req.body.patient.phone = patient.phone;

    if (!patient) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Patient not found'
      });
    }

    const prescription = new Prescription(req.body);
    await prescription.save();

    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Prescription created successfully',
      data: prescription
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions =
      await Prescription.find().populate('patientId doctorId');

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescriptions fetched successfully',
      data: prescriptions
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescription fetched successfully',
      data: prescription
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!prescription) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescription updated successfully',
      data: prescription
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findByIdAndDelete(id);

    if (!prescription) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'Prescription deleted successfully'
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.generatePrescriptionPDF = async (req, res) => {
  try {
    const { patientId } = req.body;

    const prescription = await Prescription.findOne({
      'patient.patientId': patientId
    });

    if (!prescription) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Prescription not found'
      });
    }

    const { patient } = prescription;
    prescription.complaints = prescription.complaints || [];
    prescription.findings = prescription.findings || [];

    // Generate PDF buffer
    const pdfBuffer = await renderPdf(
      'src/views/prescription.ejs',
      prescription
    );

    const existingPatient = await Patient.findOne({
      patientId: patient.patientId
    });

    let count = (existingPatient.visitedPrescriptionUrls.length || 0) + 1;
    if (count === 1) {
      if (existingPatient.prescription.url) {
        count += 1;
      }
    }

    // Upload to Google Drive and get the link
    const pdfLink = await uploadPdfToGoogleDrive(
      pdfBuffer,
      `${patient.patientId}-${patient.name}-${count}-prescription.pdf`
    );
    console.log(`PDF uploaded to Google Drive with link: ${pdfLink}`);

    if (existingPatient.prescriptionUrl) {
      existingPatient.visitedPrescriptionUrls.push({
        url: existingPatient.prescription.url,
        date: existingPatient.prescription.date
      });
    }

    existingPatient.prescription = {
      url: pdfLink,
      date: toIST(new Date())
    };

    await existingPatient.save();

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'PDF generated successfully',
      pdfLink
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: error.message || 'Internal Server Error'
    });
  }
};

exports.getPatientData = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findOne({
      'patient.patientId': id
    })
      .sort({ createdDate: -1 })
      .exec();
    if (!prescription) {
      return res.status(StatusCodes.OK).send({
        status: 'Success',
        message: 'This is a new patient',
        patient: null
      });
    }
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      message: 'This is an existing patient',
      patient: {
        id: prescription.id,
        ...prescription.patient,
        diagnosis: prescription.diagnosis
      }
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      message: err.message || 'Internal Server Error'
    });
  }
};
