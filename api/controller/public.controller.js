const StatusCodes = require('http-status-codes').StatusCodes;
const CustomerFeedback = require('../../model/customerFeedback');

//customer data
exports.createFeedback = async (req, res) => {
    try {
        const { name, imageUrl, desc, videoUrls } = req.body;

        const feedback = new CustomerFeedback({
            name,
            imageUrl,
            desc,
            videoUrls
        });

        await feedback.save();

        res.status(StatusCodes.CREATED).send({
            status: 'Feedback created successfully',
            data: feedback,
        });
    } catch (e) {
        res.status(StatusCodes.BAD_REQUEST).send({
            status: 'Creation failed',
            error: e.message || e,
        });
    }
};


exports.getTestimonials = async (req, res) => {
    try {
        const testimonials = await CustomerFeedback.find({ isTestimonial: true });

        const allVideoUrls = testimonials.flatMap(testimonial => testimonial.videoUrls || []);

        res.status(StatusCodes.OK).send({
            status: 'Success',
            data: testimonials,
            videoUrls: allVideoUrls
        });
    } catch (e) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
            status: 'Fetch failed',
            error: e.message || e,
        });
    }
};

