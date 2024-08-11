const StatusCodes = require('http-status-codes').StatusCodes;
const ClinicMetaData = require('../../model/clinicMetaData');

exports.getClinicMeta = async (req, res) => {
    try {
        const clinicMetaData = await ClinicMetaData.findOne();

        if (!clinicMetaData) {
            return res.status(StatusCodes.NOT_FOUND).send({
                status: 'Not found',
                error: 'Clinic meta data not found',
            });
        }

        res.status(StatusCodes.OK).send({
            status: 'Success',
            data: clinicMetaData,
        });
    } catch (e) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
            status: 'Fetch failed',
            error: e.message || e,
        });
    }
};
