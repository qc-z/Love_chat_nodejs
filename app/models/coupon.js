'use strict'

var mongoose = require('mongoose')
var CouponSchema = require('../schemas/coupon')
var Coupon = mongoose.model('Coupon', CouponSchema)

module.exports = Coupon
