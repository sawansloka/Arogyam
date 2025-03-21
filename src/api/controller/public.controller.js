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

// Clinic Home Data
exports.getClinicMeta = async (req, res) => {
  try {
    const clinicMetaData = await ClinicMetaData.findOne().select('-schedule');

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

exports.getClinicMetaBanner = async (req, res) => {
  try {
    const { filename } = req.query;
    const stream = await getImage(filename);
    res.set('Content-Type', 'image/*');
    stream.pipe(res);
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: err.message || err
    });
  }
};

// customer data
exports.createFeedback = async (req, res) => {
  try {
    const { name, beforeImage, afterImage, desc, videoUrls } = req.body;

    const feedback = new CustomerFeedback({
      name,
      desc,
      videoUrls
    });

    const filenameSuffix = uuidv4();
    if (beforeImage) {
      await uploadToS3(
        converBase64ToBuffer(beforeImage),
        `before_image-${filenameSuffix}`
      );
      feedback.beforeImage = `${digitalOceanService.originUrl}/before_image-${filenameSuffix}`;
    }
    if (afterImage) {
      await uploadToS3(
        converBase64ToBuffer(afterImage),
        `after_image-${filenameSuffix}`
      );
      feedback.afterImage = `${digitalOceanService.originUrl}/after_image-${filenameSuffix}`;
    }

    await feedback.save();

    return res.status(StatusCodes.CREATED).send({
      message: 'Feedback uploaded successfully'
    });
  } catch (e) {
    return res.status(StatusCodes.BAD_REQUEST).send({
      status: 'Creation failed',
      error: e.message || e
    });
  }
};

exports.getTestimonials = async (req, res) => {
  try {
    const testimonials = await CustomerFeedback.find({
      isTestimonial: true
    }).select('-isTestimonial');

    const allVideoUrls = testimonials.flatMap(
      (testimonial) => testimonial.videoUrls || []
    );

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      data: testimonials,
      videoUrls: allVideoUrls
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Fetch failed',
      error: e.message || e
    });
  }
};

// appointment booking
exports.listAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'Please provide date'
      });
    }

    const selectedDate = new Date(`${date}T00:00:00+05:30`);

    const slot = await Slot.findOne({
      date: {
        $gte: selectedDate,
        $lt: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!slot) {
      return res.status(StatusCodes.NOT_FOUND).send({
        status: 'Error',
        message: 'No slots available for the selected date'
      });
    }

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

    return res.status(StatusCodes.OK).send({
      status: 'Success',
      date: selectedDate.toISOString().split('T')[0],
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      availableSlots
    });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    const { name, phone, email, appointmentTime } = req.body;
    const currentTime = new Date();

    const existingPatient = await Patient.findOne({ name, phone });
    if (existingPatient) {
      const existingAppointmentTime = new Date(existingPatient.appointmentTime);
      if (existingAppointmentTime > currentTime) {
        return res.status(StatusCodes.BAD_REQUEST).send({
          status: 'Error',
          message:
            'An appointment is already booked for this patient in the future.'
        });
      }

      if (existingPatient.status === 'VISITED') {
        existingPatient.visitedAppointmentTime.push(
          existingPatient.appointmentTime
        );
      }

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

      return res.status(StatusCodes.OK).send({
        status: 'Success',
        message: 'Created new appointment successfully',
        appointmentId: existingPatient._id
      });
    }

    if (email) {
      const existingEmailPatient = await Patient.findOne({ email });
      if (existingEmailPatient) {
        return res.status(StatusCodes.BAD_REQUEST).send({
          status: 'Error',
          message: 'Email already exists'
        });
      }
    }

    const slotDate = new Date(appointmentTime).toISOString().split('T')[0];

    console.log(`Appointment time: ${appointmentTime}`);
    console.log(`Slot date: ${slotDate}`);

    const slot = await Slot.findOne({
      date: {
        $gte: new Date(`${slotDate}T00:00:00.000+05:30`),
        $lt: new Date(`${slotDate}T23:59:59.999+05:30`)
      }
    });

    if (!slot) {
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

    const isBreak = breakTimes.some(
      (b) => appointmentTimeIST >= b.start && appointmentTimeIST < b.end
    );
    if (
      isBreak ||
      appointmentTimeIST < startTime ||
      appointmentTimeIST >= endTime
    ) {
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

    const bookedCount = await Patient.countDocuments({
      appointmentTime: { $gte: startOfHour, $lte: endOfHour }
    });

    if (bookedCount >= slot.maxSlots) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'No available slots for the selected time'
      });
    }

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

    slot.appointmentIds.push(createdAppointment._id);
    await slot.save();

    return res.status(StatusCodes.CREATED).send({
      status: 'Success',
      message: 'Appointment booked successfully',
      appointmentId: newAppointment._id
    });
  } catch (e) {
    if (e.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: e.message
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Error',
      error: e.message || e
    });
  }
};

// Patient Appointment Tracking
exports.trackAppointmentStatus = async (req, res) => {
  try {
    const { name, phone } = req.query;

    // For testing purposes, using a fixed date
    // const testDate = new Date('2024-08-17T00:00:00.000Z'); // for testing
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(todayUTC.getUTCDate() + 1);

    const phoneNumber = Number(phone);

    const patient = await Patient.findOne({
      name,
      phone: phoneNumber,
      appointmentTime: { $gte: todayUTC, $lt: tomorrowUTC },
      status: 'BOOKED'
    });

    if (!patient) {
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
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      status: 'Tracking failed',
      error: e.message || e
    });
  }
};

// Patient Portal
exports.patientPortal = async (req, res) => {
  try {
    const { patientId, phone } = req.query;

    if (!patientId || !phone) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        status: 'Error',
        message: 'Please provide patient Id and phone'
      });
    }

    const patientData = await Patient.findOne({ patientId, phone });

    if (!patientData) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    let payment = 'Pending';

    if (patientData.status.toString() !== 'BOOKED') {
      patientData.appointmentTime = null;
    }

    if (patientData.isPaid) {
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

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching patient data:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
