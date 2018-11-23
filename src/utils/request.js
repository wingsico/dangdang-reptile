const charset = require('superagent-charset');
const superagent = require('superagent');
const request = charset(superagent);

module.exports = request;