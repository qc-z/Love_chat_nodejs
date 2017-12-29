'use strict'

var mongoose = require('mongoose')
var ChatboxSchema = require('../schemas/chatbox')
var Chatbox = mongoose.model('Chatbox', ChatboxSchema)

module.exports = Chatbox
