'use strict'

var mongoose = require('mongoose')
var TraceSchema = require('../schemas/trace')
var Trace = mongoose.model('Trace', TraceSchema)

module.exports = Trace
