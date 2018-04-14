const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

const field     = require('./routes/field');
const seed      = require('./routes/seed');
const content   = require('./routes/content');
//const comment   = require('./routes/comment');
//const like      = require('./routes/like');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());


app.use('/field', field);
app.use('/seed', seed);
app.use('/content', content);

module.exports = app;
