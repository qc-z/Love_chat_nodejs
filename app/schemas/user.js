'use strict'

var mongoose = require('mongoose')
var bcrypt = require('bcryptjs')
var SALT_WORK_FACTOR = 10
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
// var Mixed = Schema.Types.Mixed


/**
 * User Schema
 */

var UserSchema = new Schema({
  traceid: {type: ObjectId, ref: 'Trace'},
  from:String,
  mock: {
    type: Boolean,
    default: false
  },
  number: {
    type: Number,
    default: 1
  },
  isActive: {
    type: String,
    default: 'yes'
  },
  online: {
    type: String,
    default: 'no'
  },
  distance: Number,
  registration_id: String,
  platform: String,
  mobile: String,
  email: String,
  lan: String,
  faceScore: Number,
  password: String,
  nickname: String,
  oldName: String,
  age: Number,
  sex: Number,
  targetSex: Number,
  lovePrice: String,
  loveDate: String,
  assets: String,
  income: String,
  sports: [String],
  tour: [String],
  body: String,
  height: String,
  drink: String,
  smoking: String,
  education: String,
  work: String,
  character: String,
  selfInfo: String,
  looking: String,
  addr: String,
  province: String,
  city: String,
  area: String,
  iNeed: String,
  afford: String,
  hopeful: String,
  coupon: String,
  couponType: String,
  completion:{
    type: Number,
    default: 0
  },
  loginAt: {
    type: Date,
    default: Date.now
  },
  locAuthorize: {
    type: Boolean,
    default: true
  },
  lat: String,
  lng: String,
  loc: {
    type: {
      type: String
    },
    coordinates: []
  },
  ip: String,
  auditContent: {
    work: String,
    nickname: String,
    selfInfo: String,
    character: String,
    looking: String,
    avatar: String
  },
  auditReson: {
    work: String,
    nickname: String,
    selfInfo: String,
    character: String,
    looking: String,
    avatar: String
  },
  auditStatus: {
    type: String, 
    default: 'ing'
  },
  auditAt: {
    type: Date
  },
  vip: {
    role: {
      type: Boolean,
      default: false
    },
    coupons:String,
    category: String,
    from: {
      type: Date,
      default: Date.now
    },
    to: {
      type: Date,
      default: Date.now
    }
  },
  rmbTotal: {
    type: Number,
    default: 0
  },
  vipLevel: {
    type: String,
    default: 'vip0'
  },
  avatar: String,
  oldAvatar: String,
  photoPub: [],
  photoPri: [],
  firstFaceScore:Number,
  sortAt:{
    type: Date
  },
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

UserSchema.index({loc: '2dsphere'})

UserSchema.pre('save', function(next) {
  if (!this.loc ||!this.loc.coordinates || !this.loc.coordinates.length) {
    this.loc = {
      type: 'Point',
      coordinates: [113.2966370000, 23.1344520000]
    }
  }
  // if (this.isNew) {
    if (!this.meta.createdAt) {
      this.meta.createdAt = this.meta.updatedAt = Date.now()
    }
    else {
      this.meta.updatedAt = Date.now()
    }
  // }
  next()
})

/**
 * Pre-save hook
 */
UserSchema.pre('save', function(next) {
  var user = this

  // if (authTypes.indexOf(this.provider) !== -1) {
  //   return next(new Error('Invalid password'))
  // }
  if (!user.isModified('password')) return next()

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) return next(err)
    bcrypt.hash(user.password, salt, function(error, hash) {
      if (error) return next(error)

      user.password = hash
      next()
    })
  })
})


/**
 * Methods
 */
UserSchema.methods = {

  comparePassword: function(_password, password) {
    return function(cb) {
      bcrypt.compare(_password, password, function(err, isMatch) {
        cb(err, isMatch)
      })
    }
  }
}

module.exports = UserSchema
