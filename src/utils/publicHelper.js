const Patient = require('../model/patient');

exports.toIST = (date) => new Date(date.getTime() + 5.5 * 60 * 60 * 1000);

exports.checkSlotAvailibility = async (startOfHour, endOfHour, slot) => {
  const bookedCount = await Patient.countDocuments({
    appointmentTime: {
      $gte: startOfHour,
      $lt: endOfHour
    },
    status: 'BOOKED'
  });

  const isAvailable = bookedCount < slot.maxSlots;
  const formattedTime = new Date(startOfHour.getTime() - 5.5 * 60 * 60 * 1000)
    .toTimeString()
    .split(' ')[0];

  return { isAvailable, formattedTime };
};

exports.converBase64ToBuffer = (base64) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

exports.convertToKebabCase = (str) => str.trim().replace(/\s+/g, '-');

exports.convertDateFormat = (dateStr) => dateStr.replace(/\//g, '-');
