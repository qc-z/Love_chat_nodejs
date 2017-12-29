'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed

/**
 * Pay Schema
 */

var PaySchema = new Schema({
  userid: {type: ObjectId, ref: 'User'},
  from: String,
  nickname: String,
  sex: String,
  mobile: String,
  avatar: String,
  payType: String,
  units: String,
  trade_no: String,
  discount: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    default: 'ing'
  },
  agent: String,
  receipt: Mixed,
  value: Number,
  time: Number,
  meal: String,
  outTradeId: String,
  params: Mixed,
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

PaySchema.pre('save', function(next) {
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

module.exports = PaySchema
