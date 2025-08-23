const config = require('../config/config.json');

function checkAuth(req, res, next) {
    try {
        if (req.body.token === config.ci_hipi.api_token) {
            req.body.client = 'ci_hipi';
            next();
        }
        else {
            return res.status(401).json({
                'message': "Invalid or expired token provided!",
                'error': {}
            });
        }

    } catch (e) {
        return res.status(401).json({
            'message': "Invalid or expired token provided!",
            'error': e
        });
    }
}

module.exports = {
    checkAuth: checkAuth
}
