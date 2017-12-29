'use strict'

var mongoose = require('mongoose')
var bcrypt = require('bcryptjs')
var SALT_WORK_FACTOR = 10
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
// var Mixed = Schema.Types.Mixed


/**
 * Agent Schema
 */

var AgentSchema = new Schema({
  id: String,
  role: String, // boss // channel // sales
  nickname: String,
  openStatus: {
    type: String,
    default: 'ing'
  },
  sealStatus: {
    type: String,
    default: 'normal'
  },
  bossid: {type: ObjectId, ref: 'Agent'},
  channelid: {type: ObjectId, ref: 'Agent'},
  salesmanid: {type: ObjectId, ref: 'Agent'},
  remark: String,
  mobile: String,
  email: String,
  account: String,
  password: String,
  balance: String,
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

// AgentSchema.index({loc: '2dsphere'})

AgentSchema.pre('save', function(next) {
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

/**
 * Pre-save hook
 */
AgentSchema.pre('save', function(next) {
  var agent = this

  // if (authTypes.indexOf(this.provider) !== -1) {
  //   return next(new Error('Invalid password'))
  // }
  if (!agent.isModified('password')) return next()

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) return next(err)
    bcrypt.hash(agent.password, salt, function(error, hash) {
      if (error) return next(error)

      agent.password = hash
      next()
    })
  })
})


/**
 * Methods
 */
AgentSchema.methods = {

  comparePassword: function(_password, password) {
    return function(cb) {
      bcrypt.compare(_password, password, function(err, isMatch) {
        cb(err, isMatch)
      })
    }
  }
}

module.exports = AgentSchema
