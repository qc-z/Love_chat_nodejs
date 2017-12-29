'use strict'

var mongoose = require('mongoose')
var IncomeagSchema = require('../schemas/incomeag')
var Incomeag = mongoose.model('Incomeag', IncomeagSchema)

module.exports = Incomeag
