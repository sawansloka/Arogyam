const { StatusCodes } = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');
const {
  checkSlotAvailibility,
  converBase64ToBuffer
} = require('../../utils/publicHelper');
const ClinicMetaData = require('../../model/clinicMetaData');
const CustomerFeedback = require('../../model/customerFeedback');
const Patient = require('../../model/patient');
const Slot = require('../../model/slot');
const { getImage } = require('../../utils/gridFsHelper');
const { uploadToS3 } = require('../../utils/s3');
const { digitalOceanService } = require('../../config/vars');
const { logger } = require('../../config/logger');

// Clinic Home Data
exports.getClinicMeta = async (req, res) => {
  try {
    logger.info('Starting getClinicMeta function...');
    const clinicMetaData = await ClinicMetaData.findOne().select('-schedule');

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
    logger.error('Error in getClinicMeta function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
    });
  }
};

exports.getClinicMetaBanner = async (req, res) => {
  try {
    logger.info('Starting getClinicMetaBanner function...');
    const { filename } = req.query;
    logger.info(`Fetching banner image with filename: ${filename}`);
    const stream = await getImage(filename);
    res.set('Content-Type', 'image/*');
    logger.info('Banner image fetched successfully.');
    stream.pipe(res);
  } catch (err) {
    logger.error('Error in getClinicMetaBanner function:', err.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: err.message || err
    });
  }
};

// customer data
exports.createFeedback = async (req, res) => {
  try {
    logger.info('Starting createFeedback function...');
    const { name, beforeImage, afterImage, desc, videoUrls } = req.body;
    logger.info(`Creating feedback for customer: ${name}`);

    const feedback = new CustomerFeedback({
      name,
      desc,
      videoUrls
    });

    const filenameSuffix = uuidv4();
    if (beforeImage) {
      logger.info('Uploading before image to S3...');
      await uploadToS3(
        converBase64ToBuffer(beforeImage),
        `before_image-${filenameSuffix}`
      );
      feedback.beforeImage = `${digitalOceanService.originUrl}/before_image-${filenameSuffix}`;
      logger.info('Before image uploaded successfully.');
    }
    if (afterImage) {
      logger.info('Uploading after image to S3...');
      await uploadToS3(
        converBase64ToBuffer(afterImage),
        `after_image-${filenameSuffix}`
      );
      feedback.afterImage = `${digitalOceanService.originUrl}/after_image-${filenameSuffix}`;
      logger.info('After image uploaded successfully.');
    }

    await feedback.save();
    logger.info('Feedback created successfully.');
    return res.status(StatusCodes.CREATED).send({
      message: 'Feedback uploaded successfully'
    });
  } catch (e) {
    logger.error('Error in createFeedback function:', e.message);
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Creation failed',
      error: e.message || e
    });
  }
};

exports.getTestimonials = async (req, res) => {
  try {
    logger.info('Starting getTestimonials function...');
    logger.info('Fetching testimonials marked as isTestimonial: true...');
    const testimonials = await CustomerFeedback.find({
      isTestimonial: true
    }).select('-isTestimonial');

    const allVideoUrls = testimonials.flatMap(
      (testimonial) => testimonial.videoUrls || []
    );

    logger.info(`Fetched ${testimonials.length} testimonials successfully.`);
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: testimonials,
      videoUrls: allVideoUrls
    });
  } catch (e) {
    logger.error('Error in getTestimonials function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
    });
  }
};

// appointment booking
exports.listAvailableSlots = async (req, res) => {
  try {
    logger.info('Starting listAvailableSlots function...');
    const { date } = req.query;

    if (!date) {
      logger.warn('Date not provided in the request.');
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Please provide date'
      });
    }

    logger.info(`Fetching slots for the provided date: ${date}`);
    const selectedDate = new Date(`${date}T00:00:00+05:30`);

    const slot = await Slot.findOne({
      date: {
        $gte: selectedDate,
        $lt: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!slot) {
      logger.warn(`No slots available for the selected date: ${date}`);
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'No slots available for the selected date'
      });
    }

    logger.info('Slot found. Calculating available slots...');
    const availableSlots = [];
    const promises = [];
    const startTime = new Date(`${date}T${slot.startTime}:00`);
    const endTime = new Date(`${date}T${slot.endTime}:00`);
    const breakTimes = slot.breakTime.map((b) => ({
      start: new Date(`${date}T${b.start}:00`),
      end: new Date(`${date}T${b.end}:00`)
    }));

    const currentTime = new Date(startTime);

    while (currentTime < endTime) {
      if (
        !breakTimes.some((b) => currentTime >= b.start && currentTime < b.end)
      ) {
        const startOfHour = new Date(currentTime);
        const endOfHour = new Date(startOfHour);
        endOfHour.setHours(startOfHour.getHours() + 1);
        endOfHour.setMilliseconds(-1);

        promises.push(checkSlotAvailibility(startOfHour, endOfHour, slot));
      }
      currentTime.setHours(currentTime.getHours() + 1);
    }

    logger.info('Checking slot availability...');
    const results = await Promise.all(promises);
    results.forEach((result) => {
      if (result.isAvailable) {
        availableSlots.push(result.formattedTime);
      }
    });

    const formattedStartTime = startTime
      .toISOString()
      .split('T')[1]
      .split('.')[0];
    const formattedEndTime = endTime.toISOString().split('T')[1].split('.')[0];

    logger.info(
      `Available slots calculated successfully for date: ${date}. Total available slots: ${availableSlots.length}`
    );
    return res.status(StatusCodes.OK).send({
      status: 'Success',
      date: selectedDate.toISOString().split('T')[0],
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      availableSlots
    });
  } catch (e) {
    logger.error('Error in listAvailableSlots function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    logger.info('Starting bookAppointment function...');
    const { name, phone, email, appointmentTime } = req.body;
    logger.info(
      `Booking appointment for patient: ${name}, Phone: ${phone}, Email: ${email}, Appointment Time: ${appointmentTime}`
    );
    const currentTime = new Date();

    logger.info('Checking if patient already exists...');
    const existingPatient = await Patient.findOne({ name, phone });
    if (existingPatient) {
      logger.info(
        `Existing patient found with name: ${name} and phone: ${phone}`
      );
      const existingAppointmentTime = new Date(existingPatient.appointmentTime);
      if (existingAppointmentTime > currentTime) {
        logger.warn(
          'An appointment is already booked for this patient in the future.'
        );
        return res.status(StatusCodes.BAD_REQUEST).send({
          status: 'Error',
          message:
            'An appointment is already booked for this patient in the future.'
        });
      }

      if (existingPatient.status === 'VISITED') {
        logger.info('Marking previous appointment as visited.');
        existingPatient.visitedAppointmentTime.push(
          existingPatient.appointmentTime
        );
      }

      logger.info('Updating existing patient appointment details...');
      existingPatient.appointmentTime = new Date(appointmentTime);
      existingPatient.queuePosition =
        (await Patient.countDocuments({
          appointmentTime: {
            $gte: new Date(appointmentTime),
            $lt: new Date(
              new Date(appointmentTime).setHours(
                new Date(appointmentTime).getHours() + 1
              )
            )
          }
        })) + 1;
      existingPatient.status = 'BOOKED';
      await existingPatient.save();

      logger.info('Updated existing patient appointment successfully.');
      return res.status(StatusCodes.OK).send({
        status: 'Success',
        message: 'Created new appointment successfully',
        appointmentId: existingPatient._id
      });
    }

    if (email) {
      logger.info('Checking if email already exists...');
      const existingEmailPatient = await Patient.findOne({ email });
      if (existingEmailPatient) {
        logger.warn('Email already exists.');
        return res.status(StatusCodes.BAD_REQUEST).send({
          status: 'Error',
          message: 'Email already exists'
        });
      }
    }

    const slotDate = new Date(appointmentTime).toISOString().split('T')[0];
    logger.info(`Appointment time: ${appointmentTime}`);
    logger.info(`Slot date: ${slotDate}`);

    logger.info('Fetching slot for the selected date...');
    const slot = await Slot.findOne({
      date: {
        $gte: new Date(`${slotDate}T00:00:00.000+05:30`),
        $lt: new Date(`${slotDate}T23:59:59.999+05:30`)
      }
    });

    if (!slot) {
      logger.warn('No available slots for the selected date.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'No available slots for the selected date'
      });
    }

    const startTime = new Date(`${slotDate}T${slot.startTime}:00`);
    const endTime = new Date(`${slotDate}T${slot.endTime}:00`);
    const breakTimes = slot.breakTime.map((b) => ({
      start: new Date(`${slotDate}T${b.start}:00`),
      end: new Date(`${slotDate}T${b.end}:00`)
    }));

    const appointmentTimeIST = new Date(appointmentTime);

    logger.info(
      'Checking if the selected time is within break periods or outside working hours...'
    );
    const isBreak = breakTimes.some(
      (b) => appointmentTimeIST >= b.start && appointmentTimeIST < b.end
    );
    if (
      isBreak ||
      appointmentTimeIST < startTime ||
      appointmentTimeIST >= endTime
    ) {
      logger.warn(
        'Selected time is within a break period or outside working hours.'
      );
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message:
          'Selected time is within a break period or outside working hours'
      });
    }

    const appointmentHour = appointmentTimeIST.getUTCHours();
    const startOfHour = new Date(appointmentTimeIST);
    startOfHour.setHours(appointmentHour, 0, 0, 0);

    const endOfHour = new Date(startOfHour);
    endOfHour.setHours(appointmentHour + 1);
    endOfHour.setMilliseconds(-1);

    logger.info('Checking if the selected time slot is fully booked...');
    const bookedCount = await Patient.countDocuments({
      appointmentTime: { $gte: startOfHour, $lte: endOfHour }
    });

    if (bookedCount >= slot.maxSlots) {
      logger.warn('No available slots for the selected time.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'No available slots for the selected time'
      });
    }

    logger.info('Creating new appointment...');
    const newAppointment = new Patient({
      name,
      phone,
      email,
      appointmentTime: appointmentTimeIST,
      status: 'BOOKED',
      queuePosition: bookedCount + 1,
      patientType: 'NP'
    });

    const createdAppointment = await newAppointment.save();

    logger.info('Adding appointment ID to the slot...');
    slot.appointmentIds.push(createdAppointment._id);
    await slot.save();

    logger.info('Appointment booked successfully.');
    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Appointment booked successfully',
      appointmentId: newAppointment._id
    });
  } catch (e) {
    if (e.name === 'ValidationError') {
      logger.warn('Validation error occurred:', e.message);
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: e.message
      });
    }
    logger.error('Error in bookAppointment function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

// Patient Appointment Tracking
exports.trackAppointmentStatus = async (req, res) => {
  try {
    logger.info('Starting trackAppointmentStatus function...');
    const { name, phone } = req.query;
    logger.info(
      `Tracking appointment status for Name: ${name}, Phone: ${phone}`
    );

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(todayUTC.getUTCDate() + 1);

    const phoneNumber = Number(phone);

    logger.info("Searching for patient with today's appointment...");
    const patient = await Patient.findOne({
      name,
      phone: phoneNumber,
      appointmentTime: { $gte: todayUTC, $lt: tomorrowUTC },
      status: 'BOOKED'
    });

    if (!patient) {
      logger.warn('No appointment found for today.');
      return res.status(StatusCodes.OK).send({
        status: 'Success',
        data: {
          date: todayUTC.toISOString().split('T')[0],
          time: '',
          status: 'No appointment found for today',
          position: 0
        }
      });
    }

    logger.info('Appointment found. Returning appointment details...');
    const adjustedAppointmentTime = new Date(patient.appointmentTime.getTime());

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: {
        date: patient.appointmentTime.toISOString().split('T')[0],
        time: adjustedAppointmentTime.toTimeString().split(' ')[0],
        status: patient.status,
        position: patient.queuePosition
      }
    });
  } catch (e) {
    logger.error('Error in trackAppointmentStatus function:', e.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Tracking failed',
      error: e.message || e
    });
  }
};

// Patient Portal
exports.patientPortal = async (req, res) => {
  try {
    logger.info('Starting patientPortal function...');
    const { patientId, phone } = req.query;
    logger.info(
      `Fetching patient data for Patient ID: ${patientId}, Phone: ${phone}`
    );

    if (!patientId || !phone) {
      logger.warn('Validation failed: Missing patientId or phone.');
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Please provide patient Id and phone'
      });
    }

    const patientData = await Patient.findOne({ patientId, phone });

    if (!patientData) {
      logger.warn(
        `Patient not found for Patient ID: ${patientId}, Phone: ${phone}`
      );
      return res.status(404).json({ message: 'Patient not found' });
    }

    logger.info('Patient data found. Preparing response...');
    let payment = 'Pending';

    if (patientData.status.toString() !== 'BOOKED') {
      logger.info('Patient status is not BOOKED. Clearing appointment time.');
      patientData.appointmentTime = null;
    }

    if (patientData.isPaid) {
      logger.info('Patient has completed payment.');
      payment = 'Paid';
    }

    const response = {
      patientId: patientData.patientId,
      name: patientData.name,
      phone: patientData.phone,
      appointmentTime: patientData.appointmentTime,
      queuePosition: patientData.queuePosition,
      payment,
      visitedAppointmentTime: patientData.visitedAppointmentTime || null,
      prescriptionUrl: patientData.prescriptionUrl || null,
      visitedPrescriptionUrls: patientData.visitedPrescriptionUrls || null
    };

    logger.info('Returning patient portal data.');
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error in patientPortal function:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
