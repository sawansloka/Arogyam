const { StatusCodes } = require('http-status-codes');
const ClinicMetaData = require('../../model/clinicMetaData');

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
