'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
// var Mixed = Schema.Types.Mixed


/**
 * Agentuser Schema
 */

var AgentuserSchema = new Schema({
  agentid: {type: ObjectId, ref: 'Agent'},
  userid: {type: ObjectId, ref: 'User'},
  couponid: {type: ObjectId, ref: 'Coupon'},
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

AgentuserSchema.pre('save', function(next) {
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


module.exports = AgentuserSchema


