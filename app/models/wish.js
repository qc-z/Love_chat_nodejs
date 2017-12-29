'use strict'

var mongoose = require('mongoose')
var WishSchema = require('../schemas/wish')
var Wish = mongoose.model('Wish', WishSchema)

module.exports = Wish
