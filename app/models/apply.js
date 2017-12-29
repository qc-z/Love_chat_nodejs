'use strict'

var mongoose = require('mongoose')
var ApplySchema = require('../schemas/apply')
var Apply = mongoose.model('Apply', ApplySchema)

module.exports = Apply
