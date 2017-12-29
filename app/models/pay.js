'use strict'

var mongoose = require('mongoose')
var PaySchema = require('../schemas/pay')
var Pay = mongoose.model('Pay', PaySchema)

module.exports = Pay
