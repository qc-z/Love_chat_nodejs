'use strict'

var _ = require('lodash')

// Load app configuration
module.exports = _.extend(
  require('./env/all.js'),
  require('./env/' + process.env.NODE_ENV + '.json') || {})
