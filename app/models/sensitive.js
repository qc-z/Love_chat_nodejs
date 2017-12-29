'use strict'

var mongoose = require('mongoose')
var SensitiveSchema = require('../schemas/sensitive')
var Sensitive = mongoose.model('Sensitive', SensitiveSchema)

module.exports = Sensitive
