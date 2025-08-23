const config = require('../config/config.json');

const allowedIPs = [
    config.ci_hipi.ip,
    '127.0.0.1',
    'localhost'
];

const ipValidation = (req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const normalizedIP = clientIP.replace('::ffff:', '');

    /*if (allowedIPs.includes(normalizedIP)) {
        next();
    } else {
        res.status(403).send(normalizedIP);
    }*/

    // Temporarily allowing all IPs
    next();
};

module.exports = {
    ipValidation: ipValidation
}