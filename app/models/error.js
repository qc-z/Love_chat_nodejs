'use strict'

var mongoose = require('mongoose')
var ErrorSchema = require('../schemas/error')

mongoose.model('Error', ErrorSchema)
module.exports = Error
