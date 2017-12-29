'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed

/**
 * Trace Schema
 */

var TraceSchema = new Schema({
  userid: {type: ObjectId, ref: 'User'},
	loginAt: {
    type: Date,
    default: Date.now
  },
  targetChat: String,
  care: [],
  cared: [],
  careNum: {
    type: Number,
    default: 0
  },
  sex: Number,
  browse: [],
  browsed: [],
  hate: [],
  hated: [],
  photoPri: [],
  photoPried: [],
  listSet: {
    type: Boolean,
    default: true
  },
  browseSet: {
    type: Boolean,
    default: true
  },
  careSet: {
    type: Boolean,
    default: true
  },
  soundCare: {
    type: Boolean,
    default: true
  },
  soundChat: {
    type: Boolean,
    default: true
  },
  report: [],
  feedback: Mixed,
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

TraceSchema.pre('save', function(next) {
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

module.exports = TraceSchema
