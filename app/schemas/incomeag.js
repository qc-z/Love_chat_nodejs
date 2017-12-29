'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
// var Mixed = Schema.Types.Mixed


/**
 * Incomeag Schema
 */

var IncomeagSchema = new Schema({
  orderid: {type: ObjectId, ref: 'Pay'},
  meal: String, // meal_a // meal_b // meal_c
  role: String, // boss // channel // sales
  coupon: String,
  agentid: {type: ObjectId, ref: 'Agent'},
  bossid: {type: ObjectId, ref: 'Agent'},
  channelid: {type: ObjectId, ref: 'Agent'},
  profit: Number,
  inrate: Number,
  income: Number,
  status: {
    type: String,
    default: 'pre'
  }, // pre // ing/ ed
  meta: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
})

IncomeagSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.meta.createdAt) {
      this.meta.createdAt = this.meta.updatedAt = Date.now()
    }
  }
  else {
    this.meta.updatedAt = Date.now()
  }
  next()
})


module.exports = IncomeagSchema


