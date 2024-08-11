
// const jwt = require("jsonwebtoken");
const StatusCodes = require("http-status");

const adminAuth = async (req, res, next) => {
    try {
        // const token = req.header("Authorization").replace("JWT ", "");
        // const decoded = jwt.verify(token, "My Secret");
        // const user = await Student.findOne({
        //     _id: decoded._id,
        //     "tokens.token": token,
        // });

        // if (!user) {
        //     throw new Error();
        // }

        // req.token = token;
        // req.user = user;
        next();
    } catch (e) {
        res.status(StatusCodes.UNAUTHORIZED).send({ error: "Please authorize!" });
    }
};

module.exports = adminAuth;
