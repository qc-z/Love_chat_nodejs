'use strict'

var mongoose = require('mongoose')
var ReportSchema = require('../schemas/report')
var Report = mongoose.model('Report', ReportSchema)

module.exports = Report
