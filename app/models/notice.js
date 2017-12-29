'use strict'

var mongoose = require('mongoose')
var NoticeSchema = require('../schemas/notice')
var Notice = mongoose.model('Notice', NoticeSchema)

module.exports = Notice
