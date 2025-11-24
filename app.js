const express = require('express');
const bodyParser = require('body-parser');
const paymentRoute = require('./routes/payment');
const paymentCallbackRoute = require('./routes/payment.callback');
const samplePaymentCallbackRoute = require('./routes/sample-payment-callback')
const paymentStatusRoute = require('./routes/payment-status');
const bundleReqeustRoute = require('./routes/bundle-request');
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Payment API",
            version: "1.0.0",
            description: "Payment API For Hipi Service"},
        servers: [
            {
                // url: `https://hipi-ng.gosupa.io`,
                url: `http://localhost:6022`
            },
        ],
    },
    apis: ["./routes/*.js"],
};

const uiOptions = {
    customCss: `
    .topbar-wrapper img {
    // content:url('https://hipi-kenya.gosupa.io/images/logo.png');
    }
    // .swagger-ui .topbar { display: none }
    `,
    customSiteTitle: "Supa Payment Gateway GH",
    customfavIcon: "./assets/logo.ico"
};

const specs = swaggerJsDoc(options);

const app = express();


app.use("/gh/v1/api-docs", swaggerUI.serve, swaggerUI.setup(specs, uiOptions));

app.use(bodyParser.json());

app.use("/payments", paymentRoute);
app.use("/payments/callback", paymentCallbackRoute);
app.use("/sample-payment-callback", samplePaymentCallbackRoute);
app.use("/payment-status", paymentStatusRoute);
app.use("/bundle-requests", bundleReqeustRoute);

module.exports = app;