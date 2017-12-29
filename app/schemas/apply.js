'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId

/**
 * Mnggent Schema
 */

var ApplySchema = new Schema({
  agentid: {type: ObjectId, ref: 'Agent'},
  category: String, // addchannel // addboss // upgrade
  reasons: String,
  approvalid: {type: ObjectId, ref: 'Mngagent'},
  creater: {type: ObjectId, ref: 'Mngagent'},
  result: {
    type: String,
    default: 'ing'
  },
  meta: {
    approvalAt: {
      type: Date,
      default: Date.now
    },
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

ApplySchema.pre('save', function(next) {
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


module.exports = ApplySchema
