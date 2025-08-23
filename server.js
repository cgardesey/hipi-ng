const http = require('http');
const https = require('https');
const app = require('./app');
const port = 6002;

app.set('trust proxy', true);

const server = http.createServer(app);

server.listen(port, '0.0.0.0');
