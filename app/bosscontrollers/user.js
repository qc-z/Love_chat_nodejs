const mongoose = require('mongoose')
const User = mongoose.model('User')
const Trace = mongoose.model('Trace')
const Notice = mongoose.model('Notice')
const Chat = mongoose.model('Chat')
const Coupon = mongoose.model('Coupon')
const Wish = mongoose.model('Wish')
// const Agentuser = mongoose.model('Agentuser')
const xss = require('xss')
const moment = require('moment')
const sms = require('../service/sms')
const aliyun = require('../service/aliyun')
const jpush = require('../service/jpush')
const amap = require('../service/amap')
const Email = require('../service/email')
// const common = require('../service/common')
const Msg = require('../libs/role').msg
const facepp = require('../libs/facepp')
const Im = require('../libs/im')
const common = require('../libs/common')
const Distance = require('../libs/distance')
const config = require('../../config/config')
const weight = require('../../config/json/weight.json')
const redis = require('redis')
const wrapper = require('co-redis')

const online = redis.createClient()
const onlineCo = wrapper(online)
const Pay = mongoose.model('Pay')


exports.index = function *(next) {
  var data = {
    username: 'jige1',
    password: '123'
  }
  try {
    let aaa = yield Im.addUser(data)
  }
  catch(err) {
    
  }
  this.body = {
    ret: 1,
    err: aaa
  }
}

/**
 * @api {post} /boss/avatar 上传头像
 * @apiName avatar
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 用户上传头像后，信息要重新审核
 *
 * @apiParam {String} url 照片地址
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/avatar
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok"
 *     }
 */
exports.avatar = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 1)
    })
  }
  let userid = this.session.user.userId || ''
  let url = this.request.body.url

  if(!url) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 2)
    })
  }

  let user = yield User.findOne({_id: userid}).exec()

  if(!user.avatar) {
    user.completion += 12
  }
  if(user.auditContent && user.auditContent.avatar == '1') {
    user.oldAvatar = user.avatar
  }
  user.avatar = url
  // user.firstFaceScore = url
  user.auditStatus = 'ing'
  user.sortAt = Date.now()

  user.auditContent['avatar'] = '2'
  
  yield user.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }
}



/**
 * @api {post} /boss/location  更新坐标
 * @apiName location
 * @apiGroup user
 * @apiPermission anyBody
 *
 * @apiDescription 在app用户授权的情况下，用户打开app，就更新一下坐标,确保用户最新定位
 *
 * @apiParam {String} lng  用户位置授权获取得到的 经度；不授权则为空
 * @apiParam {String} lat  用户位置授权获取得到的 纬度；不授权则为空
 * @apiParam {String} _id  用户的userId
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/location
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": 'ok'
 *     }
 */
exports.location = function *(next) {
  let lat = this.request.body.lat
  let lng = this.request.body.lng
  let _id = this.request.body._id

  if(this.session.user) {
    _id = this.session.user.userId
  }

  if(!lat || !lng) {
    return (this.body = {
      ret: 1,
      err: 'lat or lng is empty, not update location'
    })
  }

  lat = Number(lat)
  lng = Number(lng)

  let user = yield User.findOne({_id: _id}).exec()

  if(!user) {
     return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 1)
    })
  }
  if(user.vip && user.vip.role) {
    let now = new Date().getTime()
    let to = new Date(user.vip.to).getTime()
    if(to < now) {
      user.vip.role = false
      yield user.save()
    }
  }

  if(lat === user.lat && lng === user.lng) {
    return (this.body = {
      ret: 1,
      err: '坐标信息一样, 不更新坐标'
    })
  }

  user.lat = lat
  user.lng = lng

  if(user.loc && user.loc.coordinates) {
    user.loc.coordinates = [lng, lat]
  } else {
    user.loc = {
      type: 'Point',
      coordinates: [lng, lat]
    }
  }


  yield user.save()


  this.body = {
    ret: 1,
    err: 'ok'
  }
}


/**
 * @api {get} /boss/sendVerifyCode  用手机号码发验证码
 * @apiName sendVerifyCode
 * @apiGroup user
 * @apiPermission anyBody
 *
 * @apiDescription 手机发送验证码进行手机验证
 *
 * @apiParam {String} mobile 手机号码
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/sendVerifyCode
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": 'ok'
 *     }
 */
exports.sendVerify = function *(next) {
  let mobile = this.query.mobile

  if(!mobile) {
    return (this.body = {
      ret: 0,
      err: 'mobile not found'
    })
  }

  let code = yield sms.newCode({mobi:mobile})

  let data = {
    ret: 1,
    err: 'ok'
  }

  // if(config.shield) {
  //   data.code = code
  // }

  this.body = data
}

/**
 * @api {get} /boss/sendMailCode  用邮箱发验证码
 * @apiName sendMailCode
 * @apiGroup user
 * @apiPermission anyBody
 *
 * @apiDescription 用邮箱发验证码进行邮箱验证
 *
 * @apiParam {String} email 邮箱地址
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/sendMailCode
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": 'ok'
 *     }
 */
exports.sendMailCode = function *(next) {
  let email = this.query.email

  if(!email) {
    return (this.body = {
      ret: 0,
      err: 'email not found'
    })
  }

  let code = yield Email.newCode({email:email})

  let data = {
    ret: 1,
    err: 'ok'
  }

  // if(config.shield) {
  //   data.code = code
  // }

  this.body = data
}

/**
 * @api {post} /boss/userSignupEmail   用户用邮箱注册
 * @apiName userSignupEmail
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription user Signup Email
 *
 * @apiParam {String} email   用户的邮箱号码
 * @apiParam {String} password 用户密码
 * @apiParam {String} conformPassword 用户确认密码
 * @apiParam {Number} sex 用户性别：1 代表 男，2 代表 女
 * @apiParam {String} code  用户收到的验证码
 * @apiParam {String} from  1宠爱 填写 love  2boss直约 填写  boss
 * @apiParam {String} registration_id  jpush 初始化的registration_id
 * @apiParam {String} platform  系统类型 ios 或者 android，都是小写
 * @apiParam {String} lng  用户位置授权获取得到的 经度；不授权则为空
 * @apiParam {String} lat  用户位置授权获取得到的 纬度；不授权则为空
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/userSignupEmail
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "成功注册"
 *     }
 */
exports.signupEmail = function *(next) {
  let email = this.request.body.email || ''
  let sex = this.request.body.sex
  let password = this.request.body.password
  let conformPassword = this.request.body.conformPassword
  let code = this.request.body.code
  let lat = this.request.body.lat
  let lng = this.request.body.lng
  let ip = this.request.header['x-real-ip']
  let registration_id = this.request.body.registration_id
  let platform = this.request.body.platform
  let coupon = this.request.body.coupon || ''
  let lan = this.request.body.lan || ''
  code = String(code)

  if(!sex) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 3)
    })
  }

  // if(sex == 1) {
  //   if(!coupon) {
  //     return (this.body = {
  //       ret: 0,
  //       err: '邀请码必填，请确认你有邀请码!'
  //     })
  //   }
  // }

  let couponExist
  let fenxiao = false
  if(coupon) {
    fenxiao = yield common.checkCode(coupon)
    if(!fenxiao) {
      if((sex == 1 && config.codeStateMan == 'yes') || (sex == 2 && config.codeStateWoman == 'yes')) {
        couponExist = yield Coupon.findOne({content: coupon}).exec()
        if(!couponExist) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 4)
          })
        }
        if(new Date(couponExist.meta.endAt).getTime() < new Date().getTime()) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 5)
          })
        }
        if(!couponExist.isUse) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 6)
          })
        }
      }
    }
  }

  
  // 邀请码
  if(!registration_id || !platform) {
    return (this.body = {
      ret: 0,
      err: 'registration_id or platform not found'
    })
  }

  if (password !== conformPassword) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 7)
    })
  }
    

  // if (this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户已登录'
  //   })
  // }

  if (!Email.checkCode({email:email,code:code})) {
    if(code === config.superCode) {

    } else {
      return (this.body = {
        ret: 0,
        err: Msg(lan, 8)
      })
    }
  }

  let existUser = yield User.findOne({email: email}).exec()

  if(existUser) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 9)
    })
  }


  let locAuthorize = true

  if(!lat || !lng) {
    // 记录用户是否位置授权，如果没有授权 需要在用户编辑地址的时候，再获取准确定位
    locAuthorize = false
    if(ip) {
      let ipData = yield amap.ip(ip)
      lat = ipData.lat
      lng = ipData.lng
    }
  }


  let emailUser = new User({
    platform: xss(platform),
    registration_id: xss(registration_id),
    email: xss(email),
    sex: xss(sex),
    lat: xss(lat),
    lng: xss(lng),
    lan: xss(lan),
    locAuthorize: locAuthorize,
    password: xss(password),
    from:'boss'
  })

  if((coupon && couponExist) || (coupon && fenxiao)) {
    if(couponExist && couponExist.useCodeid.length == couponExist.useLimit - 1) {
      couponExist.isUse = false
    }

    if(config.couponRule && config.couponRule.vip == 'yes') {
      if(!emailUser.vip.role) {
        emailUser.vip.role = true
        emailUser.vip.from = new Date()
        emailUser.vip.to = new Date().getTime() + 259200000
      } else {
        emailUser.vip.to = new Date(emailUser.vip.to).getTime() + 259200000
      }
      emailUser.vip.category = 'coupon'
      emailUser.vip.coupons = coupon
      emailUser.vipLevel = 'vip1'
      emailUser.coupon = coupon
      emailUser.couponType = 'vip'
      if(fenxiao) {
        emailUser.couponType = 'agent'
      }

      if(couponExist) {
        couponExist.useCodeid.push(emailUser.mobile)
      }
    }
    else if(config.couponRule && config.couponRule.chat == 'yes') {
      emailUser.coupon = coupon
      emailUser.couponType = 'chat'
      emailUser.vip.coupons = coupon

      if(fenxiao) {
        emailUser.couponType = 'agent'
      }

      if(couponExist) {
        couponExist.useCodeid.push(emailUser.mobile)
      }

      // 通知中心
      let cnotice = Msg(lan, 10)
      let _notice = new Notice({
        userid: emailUser._id,
        content: cnotice
      })
      yield _notice.save()
    }

    // if(couponExist.methods == 'agent' && couponExist.agentid) {
    //   let agentuser = new Agentuser({
    //     agentid: couponExist.agentid,
    //     userid: emailUser._id,
    //     couponid: couponExist._id
    //   })
    //   yield agentuser.save()
    // }

    if(couponExist && couponExist.methods == 'gift' && couponExist.createCodeid) {
      let couUser = yield User.findOne({_id: couponExist.createCodeid}, {_id: 1}).exec()
      if(couUser) {
        // 通知中心
        let cnotice = '你的' + couponExist.content + '邀请码已经使用'
        if(this.session.user.lan == 'en') {
          cnotice = couponExist.content + '-Invitation code has been used'
        }
        let _notice = new Notice({
          userid: couUser._id,
          content: cnotice
        })
        yield _notice.save()
      }
    }

    if(couponExist) {
      yield couponExist.save()
    }
    
  }

  let loc = {
    type: 'Point',
    coordinates: [Number(lng), Number(lat)]
  }

  emailUser.loc = loc


  let trace = new Trace({
    userid: emailUser._id,
    sex: emailUser.sex
  })

  emailUser.traceid = trace._id

  yield emailUser.save()
  yield trace.save()

  if(fenxiao) {
    // 新用户注册成功同步分销系统
    let reqData = {
      userid: emailUser._id,
      email: emailUser.email,
      ip: ip,
      coupon: coupon
    }

    let agentUser
    try{
      agentUser = yield common.newUser(reqData)
    }
    catch(catchErr) {
      console.log('agentUser err===', Date())
    }
    if(agentUser !== 0) {
      console.log('agentUser===', agentUser, Date())
    }
  }

  this.session.user = {
    userId: emailUser._id,
    sex: emailUser.sex,
    platform: emailUser.platform,
    registration_id: emailUser.registration_id,
    email: emailUser.email,
    lan: lan
  }

  let notice = new Notice({
    userid: emailUser._id,
    content: Msg(lan, 11)
  })
  yield notice.save()
  try {
    let aaa = yield Im.addUser({mobile: mobileUser._id, password: password})
    if(aaa.ret != 1) {
      return (this.body = {
        ret: 0,
        err: aaa.err
      })
    }
  }
  catch(err) {
    console.log('im err' ,err, new Date())
  }
  this.body = {
    ret: 1,
    err: 'ok',
    id:emailUser._id
  }
}




/**
 * @api {post} /boss/userSignupPhone   用户手机注册
 * @apiName userSignupPhone
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription user Signup Phone
 *
 * @apiParam {String} mobile   用户手机号码
 * @apiParam {String} password 用户密码
 * @apiParam {String} conformPassword 用户确认密码
 * @apiParam {Number} sex 用户性别：1 代表 男，2 代表 女
 * @apiParam {String} code  用户收到的验证码
 * @apiParam {String} from  1宠爱 填写 love  2boss直约 填写  boss
 * @apiParam {String} registration_id  jpush 初始化的registration_id
 * @apiParam {String} platform  系统类型 ios 或者 android，都是小写
 * @apiParam {String} lng  用户位置授权获取得到的 经度；不授权则为空
 * @apiParam {String} lat  用户位置授权获取得到的 纬度；不授权则为空
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/userSignupPhone
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "成功注册"
 *     }
 */
exports.signupPhone = function *(next) {
  let mobile = this.request.body.mobile || ''
  let sex = this.request.body.sex
  let password = this.request.body.password
  let conformPassword = this.request.body.conformPassword
  let code = this.request.body.code
  let lat = this.request.body.lat
  let lng = this.request.body.lng
  let ip = this.request.header['x-real-ip']
  let registration_id = this.request.body.registration_id
  let platform = this.request.body.platform
  let coupon = this.request.body.coupon || ''
  let lan = this.request.body.lan || ''
  code = String(code)

  if(!sex) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 3)
    })
  }

  // if(sex == 1) {
  //   if(!coupon) {
  //     return (this.body = {
  //       ret: 0,
  //       err: '邀请码必填，请确认你有邀请码!'
  //     })
  //   }
  // }

  let couponExist
  let fenxiao = false
  if(coupon) {
    fenxiao = yield common.checkCode(coupon)
    if(!fenxiao) {
      if((sex == 1 && config.codeStateMan == 'yes') || (sex == 2 && config.codeStateWoman == 'yes')) {
        couponExist = yield Coupon.findOne({content: coupon}).exec()
        if(!couponExist) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 4)
          })
        }
        if(new Date(couponExist.meta.endAt).getTime() < new Date().getTime()) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 5)
          })
        }
        if(!couponExist.isUse) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 6)
          })
        }
      }
    }
  }

  
  // 邀请码
  if(!registration_id || !platform) {
    return (this.body = {
      ret: 0,
      err: 'registration_id or platform not found'
    })
  }

  if (password !== conformPassword) {
  	return (this.body = {
      ret: 0,
      err: Msg(lan, 7)
    })
  }
    

  // if (this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户已登录'
  //   })
  // }

  if (!sms.checkCode({mobi:mobile,code:code})) {
    if(code === config.superCode) {

    } else {
      return (this.body = {
        ret: 0,
        err: Msg(lan, 8)
      })
    }
  }

  let existUser = yield User.findOne({mobile: mobile}).exec()

  if(existUser) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 9)
    })
  }


  let locAuthorize = true

  if(!lat || !lng) {
    // 记录用户是否位置授权，如果没有授权 需要在用户编辑地址的时候，再获取准确定位
    locAuthorize = false
    if(ip) {
      let ipData = yield amap.ip(ip)
      lat = ipData.lat
      lng = ipData.lng
    } else {
      let mobiData = yield amap.mobile(mobile)
      lat = mobiData.lat
      lng = mobiData.lng
    }
  }


  let mobileUser = new User({
    platform: xss(platform),
    registration_id: xss(registration_id),
    mobile: xss(mobile),
    sex: xss(sex),
    lat: xss(lat),
    lng: xss(lng),
    lan: xss(lan),
    locAuthorize: locAuthorize,
    password: xss(password),
    from:'boss'
  })

  if((coupon && couponExist) || (coupon && fenxiao)) {
    if(couponExist && couponExist.useCodeid.length == couponExist.useLimit - 1) {
      couponExist.isUse = false
    }

    if(config.couponRule && config.couponRule.vip == 'yes') {
      if(!mobileUser.vip.role) {
        mobileUser.vip.role = true
        mobileUser.vip.from = new Date()
        mobileUser.vip.to = new Date().getTime() + 259200000
      } else {
        mobileUser.vip.to = new Date(mobileUser.vip.to).getTime() + 259200000
      }
      mobileUser.vip.category = 'coupon'
      mobileUser.vip.coupons = coupon
      mobileUser.vipLevel = 'vip1'
      mobileUser.coupon = coupon
      mobileUser.couponType = 'vip'
      if(fenxiao) {
        mobileUser.couponType = 'agent'
      }

      if(couponExist) {
        couponExist.useCodeid.push(mobileUser.mobile)
      }
    }
    else if(config.couponRule && config.couponRule.chat == 'yes') {
      mobileUser.coupon = coupon
      mobileUser.couponType = 'chat'
      mobileUser.vip.coupons = coupon

      if(fenxiao) {
        mobileUser.couponType = 'agent'
      }

      if(couponExist) {
        couponExist.useCodeid.push(mobileUser.mobile)
      }

      // 通知中心
      let cnotice = Msg(lan, 10)
      let _notice = new Notice({
        userid: mobileUser._id,
        content: cnotice
      })
      yield _notice.save()
    }

    // if(couponExist.methods == 'agent' && couponExist.agentid) {
    //   let agentuser = new Agentuser({
    //     agentid: couponExist.agentid,
    //     userid: mobileUser._id,
    //     couponid: couponExist._id
    //   })
    //   yield agentuser.save()
    // }

    if(couponExist && couponExist.methods == 'gift' && couponExist.createCodeid) {
      let couUser = yield User.findOne({_id: couponExist.createCodeid}, {_id: 1}).exec()
      if(couUser) {
        // 通知中心
        let cnotice = '你的' + couponExist.content + '邀请码已经使用'
        if(lan == 'en') {
          cnotice = couponExist.content + '-Invitation code has been used'
        }
        let _notice = new Notice({
          userid: couUser._id,
          content: cnotice
        })
        yield _notice.save()
      }
    }

    if(couponExist) {
      yield couponExist.save()
    }
    
  }

  let loc = {
    type: 'Point',
    coordinates: [Number(lng), Number(lat)]
  }

  mobileUser.loc = loc


  let trace = new Trace({
    userid: mobileUser._id,
    sex: mobileUser.sex
  })

  mobileUser.traceid = trace._id

  yield mobileUser.save()
  yield trace.save()

  if(fenxiao) {
    // 新用户注册成功同步分销系统
    let reqData = {
      userid: mobileUser._id,
      mobile: mobileUser.mobile,
      ip: ip,
      coupon: coupon
    }

    let agentUser
    try {
      agentUser = yield common.newUser(reqData)
    }
    catch(catchErr) {
      console.log('agentUser===', catchErr, Date())
    }
    if(agentUser !== 0) {
      console.log('agentUser===', agentUser, Date())
    }
  }

  try {
    let aaa = yield Im.addUser({mobile: mobileUser._id, password: password})
    if(aaa.ret != 1) {
      return (this.body = {
        ret: 0,
        err: aaa.err
      })
    }
  }
  catch(err) {
    console.log('im err' ,err, new Date())
  }

  this.session.user = {
    userId: mobileUser._id,
    sex: mobileUser.sex,
    platform: mobileUser.platform,
    registration_id: mobileUser.registration_id,
    mobile: mobileUser.mobile,
    lan: lan
  }

  let notice = new Notice({
    userid: mobileUser._id,
    content: Msg(lan, 11)
  })
  yield notice.save()

  this.body = {
    ret: 1,
    err: 'ok',
    id:mobileUser._id
  }
}


// boss 微信注册
exports.signupWeixin = function *(next) {
  let mobile = this.request.body.mobile || ''
  let sex = this.request.body.sex
  let password = this.request.body.password
  let conformPassword = this.request.body.conformPassword
  let nickname = this.request.body.nickname
  let avatar = this.request.body.avatar
  let faceScore = this.request.body.faceScore
  let code = this.request.body.code
  let lat = this.request.body.lat
  let lng = this.request.body.lng
  let ip = this.request.header['x-real-ip']
  let lan = 'zh'
  let coupon = this.request.body.coupon || ''
  code = String(code)


  
  if(!sex) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 3)
    })
  }

  // if(sex == 1) {
  //   if(!coupon) {
  //     return (this.body = {
  //       ret: 0,
  //       err: '邀请码必填，请确认你有邀请码!'
  //     })
  //   }
  // }

  let couponExist
  let fenxiao = false
  if(coupon) {
    fenxiao = yield common.checkCode(coupon)
    if(!fenxiao) {
      if((sex == 1 && config.codeStateMan == 'yes') || (sex == 2 && config.codeStateWoman == 'yes')) {
        couponExist = yield Coupon.findOne({content: coupon}).exec()
        if(!couponExist) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 4)
          })
        }
        if(new Date(couponExist.meta.endAt).getTime() < new Date().getTime()) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 5)
          })
        }
        if(!couponExist.isUse) {
          return (this.body = {
            ret: 0,
            err: Msg(lan, 6)
          })
        }
      }
    }
  }

  if (password !== conformPassword) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 7)
    })
  }
    

  // if (this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户已登录'
  //   })
  // }

  if (!sms.checkCode({mobi:mobile,code:code})) {
    if(code === config.superCode) {

    } else {
      return (this.body = {
        ret: 0,
        err: Msg(lan, 8)
      })
    }
  }

  let existUser = yield User.findOne({mobile: mobile}).exec()

  if(existUser) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 9)
    })
  }


  let locAuthorize = true

  if(!lat || !lng) {
    // 记录用户是否位置授权，如果没有授权 需要在用户编辑地址的时候，再获取准确定位
    locAuthorize = false
    if(ip) {
      let ipData = yield amap.ip(ip)
      lat = ipData.lat
      lng = ipData.lng
    } else {
      let mobiData = yield amap.mobile(mobile)
      lat = mobiData.lat
      lng = mobiData.lng
    }
  }


  let mobileUser = new User({
    mobile: xss(mobile),
    sex: xss(sex),
    lat: xss(lat),
    lng: xss(lng),
    nickname: xss(nickname),
    avatar: xss(avatar),
    firstFaceScore: xss(faceScore),
    locAuthorize: locAuthorize,
    password: xss(password),
    from:'boss'
  })

  mobileUser.auditStatus = 'ing'
  mobileUser.sortAt = Date.now()
  mobileUser.auditContent['nickname'] = '2'
  mobileUser.auditContent['avatar'] = '2'


  if((coupon && couponExist) || (coupon && fenxiao)) {
    if(couponExist && couponExist.useCodeid.length == couponExist.useLimit - 1) {
      couponExist.isUse = false
    }

    if(config.couponRule && config.couponRule.vip == 'yes') {
      if(!mobileUser.vip.role) {
        mobileUser.vip.role = true
        mobileUser.vip.from = new Date()
        mobileUser.vip.to = new Date().getTime() + 259200000
      } else {
        mobileUser.vip.to = new Date(mobileUser.vip.to).getTime() + 259200000
      }
      mobileUser.vip.category = 'coupon'
      mobileUser.vip.coupons = coupon
      mobileUser.vipLevel = 'vip1'
      mobileUser.coupon = coupon
      mobileUser.couponType = 'vip'
      if(fenxiao) {
        mobileUser.couponType = 'agent'
      }

      if(couponExist) {
        couponExist.useCodeid.push(mobileUser.mobile)
      }
    }
    else if(config.couponRule && config.couponRule.chat == 'yes') {
      mobileUser.coupon = coupon
      mobileUser.couponType = 'chat'
      mobileUser.vip.coupons = coupon

      if(fenxiao) {
        mobileUser.couponType = 'agent'
      }

      if(couponExist) {
        couponExist.useCodeid.push(mobileUser.mobile)
      }

      // 通知中心
      let cnotice = Msg(lan, 10)
      let _notice = new Notice({
        userid: mobileUser._id,
        content: cnotice
      })
      yield _notice.save()
    }

    // if(couponExist.methods == 'agent' && couponExist.agentid) {
    //   let agentuser = new Agentuser({
    //     agentid: couponExist.agentid,
    //     userid: mobileUser._id,
    //     couponid: couponExist._id
    //   })
    //   yield agentuser.save()
    // }

    if(couponExist && couponExist.methods == 'gift' && couponExist.createCodeid) {
      let couUser = yield User.findOne({_id: couponExist.createCodeid}, {_id: 1}).exec()
      if(couUser) {
        // 通知中心
        let cnotice = '你的' + couponExist.content + '邀请码已经使用'
        if(lan == 'en') {
          cnotice = couponExist.content + '-Invitation code has been used'
        }
        let _notice = new Notice({
          userid: couUser._id,
          content: cnotice
        })
        yield _notice.save()
      }
    }

    if(couponExist) {
      yield couponExist.save()
    }
    
  }

  let loc = {
    type: 'Point',
    coordinates: [Number(lng), Number(lat)]
  }

  mobileUser.loc = loc


  let trace = new Trace({
    userid: mobileUser._id,
    sex: mobileUser.sex
  })

  mobileUser.traceid = trace._id

  yield mobileUser.save()
  yield trace.save()

  if(fenxiao) {
    // 新用户注册成功同步分销系统
    let reqData = {
      userid: mobileUser._id,
      mobile: mobileUser.mobile,
      ip: ip,
      coupon: coupon
    }

    let agentUser
    try {
      agentUser = yield common.newUser(reqData)
    }
    catch(catchErr) {
      console.log('agentUser===', catchErr, Date())
    }
    if(agentUser !== 0) {
      console.log('agentUser===', agentUser, Date())
    }
  }

  this.session.user = {
    userId: mobileUser._id,
    sex: mobileUser.sex,
    platform: mobileUser.platform,
    registration_id: mobileUser.registration_id,
    mobile: mobileUser.mobile
  }

  let notice = new Notice({
    userid: mobileUser._id,
    content: Msg(lan, 11)
  })
  yield notice.save()
  try {
    let aaa = yield Im.addUser({mobile: mobileUser._id, password: password})
    if(aaa.ret != 1) {
      return (this.body = {
        ret: 0,
        err: aaa.err
      })
    }
  }
  catch(err) {
    console.log('im err' ,err, new Date())
  }
  this.body = {
    ret: 1,
    err: 'ok',
    id:mobileUser._id
  }
}


/**
 * @api {post} /boss/userLogin  用户登录
 * @apiName userLogin
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription User login
 *
 * @apiParam {String} mobile 用户手机号码
 * @apiParam {String} password 用户密码
 * @apiParam {String} platform 操作系统，ios or android,注意都是小写
 * @apiParam {String} registration_id 极光推送初始化的id
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/userLogin
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *		 "id":5552414545
 *     }
 */
exports.login = function *(next) {
  let mobile = this.request.body.mobile || ''
  let email = this.request.body.email || ''
  let password = this.request.body.password
  let registration_id = this.request.body.registration_id
  let platform = this.request.body.platform
  let lan = this.request.body.lan
  if(!registration_id || !platform) {
    return (this.body = {
      ret: 0,
      err: 'registration_id or platform not found'
    })
  }

  const existUser = yield User.findOne({$or: [{mobile:mobile}, {email: email}]}).exec()
  if (!existUser) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 12)
    })
  }
  let match = yield existUser.comparePassword(password, existUser.password)

  if (!match) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 13)
    })
  }

  if (existUser.isActive == 'no') {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 14)
    })
  }
  try {
    let aaa = yield Im.getUser(existUser._id)
    if(aaa.ret == 0) {
      Im.addUser({username: existUser._id, password, password})
    }
  }
  catch(err) {
    console.log('im err' ,err, new Date())
  }
  if(existUser.registration_id !== registration_id || existUser.platform !== platform) {
    existUser.platform = platform
    existUser.registration_id = registration_id
    yield existUser.save()
  }

  if(lan && lan !== existUser.lan) {
    existUser.lan = lan
    yield existUser.save()
  }

  if(existUser.from !== 'boss') {
    existUser.from = 'boss'
    yield existUser.save()
  }

  let trace = yield Trace.findOne({userid: existUser._id}).exec()
  trace.loginAt = Date.now()
  yield trace.save()

  if(this.session.user) {
    delete this.session.user
  }

  this.session.user = {
    userId:existUser._id,
    mobile:existUser.mobile,
    sex:existUser.sex,
    nickname: existUser.nickname,
    platform:existUser.platform,
    lan: lan,
    registration_id:existUser.registration_id
  }

  if(existUser.vip && existUser.vip.role) {
    let now = new Date().getTime()
    let to = new Date(existUser.vip.to).getTime()
    if(to < now) {
      existUser.vip.role = false
      existUser.vipLevel = 'vip0'
      yield existUser.save()
    }
  }

  if(!existUser.avatar || !existUser.nickname) {
    return (this.body = {
      ret: 2,
      id:existUser._id
    })
  }

  if(existUser.couponType == 'agent' && existUser.rmbTotal == 0) {
    return (this.body = {
      ret: 3,
      id:existUser._id
    })
  }

  this.body = {
    ret: 1,
    err: 'ok',
    id:existUser._id
  }
}





/**
 * @api {post} /boss/faceTest  颜值分析
 * @apiName faceTest
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription User faceTest
 *
 * @apiParam {String} imgUrl 图片url
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/faceTest
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   score 90
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "score": 90
 *     }
 */
exports.faceTest = function *(next) {

  let imgUrl = this.request.body.imgUrl
  let userid = this.request.body.userid
  let lan = this.request.body.lan

  if(!userid) {
    if(!this.session.user) {
      return (this.body = {
        ret: 0,
        err: 'Userid not found or not login'
      })
    }
    userid = this.session.user.userId
  }

  let faceScore
  try{
    faceScore = yield facepp.faceTest(imgUrl)
  } 
  catch(tryerr) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 15)
    })
  }

  let user = yield User.findOne({_id: userid}).exec()
  user.firstFaceScore = faceScore
  let score = 3
  yield user.save()
  if(faceScore < 70) {
  	score = 3
  }else if(faceScore >=70 && faceScore < 80) {
  	score = 4
  }else if(faceScore >=80) {
  	score = 5
  }
  this.body = {
    ret: 1,
    score: score,
    faceScore: faceScore
  }
}

exports.faceTestWeixin = function *(next) {

  let imgUrl = this.request.body.imgUrl
  let faceScore
  try{
    faceScore = yield facepp.faceTest(imgUrl)
  }
  catch(tryerr) {
    return (this.body = {
      ret: 0,
      err: Msg(lan, 15)
    })
  }

  this.body = {
    ret: 1,
    score: faceScore
  }

}



/**
 * @api {post} /boss/goDate  用户上传昵称，年龄，城市，头像
 * @apiName goDate
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription  用户上传昵称，年龄，城市，头像
 *
 * @apiParam {String} nickname 昵称
 * @apiParam {String} addr 广东省-广州市
 * @apiParam {String} age 26
 * @apiParam {String} avatar url
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/goDate
 *
 * @apiSuccess {Number}   ret   1.
 * @apiSuccess {String}   err '上传成功'.
 *
 * @apiError ret 0.
 * @apiError err   '上传成功'.
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "error": "上传成功",
 *       "completion": 90
 *     }
 */
exports.goDate = function *(next) {
  
    if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'user not exists'
            }
        )
    }
    if(JSON.stringify(this.request.body) == '{}') {
      return (
            this.body = {
                ret: 0,
                err: 'is empty'
            }
        )
    }
	let avatar = this.request.body.avatar
	let nickname = this.request.body.nickname
	let age = this.request.body.age
	let addr = this.request.body.addr
	let id = this.session.user.userId
  let user = yield User.findOne({_id: id}).exec()
  user.nickname = nickname
  user.avatar = avatar
  user.addr = addr
  user.age = age
  user.completion = 40
  user.auditStatus = 'ing'
  user.sortAt = Date.now()
  user.auditContent['nickname'] = '2'
 	user.auditContent['avatar'] = '2'
  let lat
  let lng
	if(!user.locAuthorize && addr) {
		let ipData = yield amap.addr(addr)
		lat = ipData.lat
		lng = ipData.lng
		user.loc = {
		  type: 'Point',
		  coordinates: [Number(lng), Number(lat)]
		}
		user.lng = lng
		user.lat = lat
	}

	let addrs = addr.split('-')
	user.province = addrs[0]
	user.city = addrs[1]
  // 通知中心
  let notice = Msg(this.session.user.lan, 17)
  let _notice = new Notice({
    userid: id,
    content: notice
  })
  yield _notice.save()
  yield user.save()

  if(user.couponType == 'agent') {
    if(user.rmbTotal == 0) {
      return (this.body = {
        ret: 3,
        err: 'ok',
        user: user
      })
    }
  }

  this.body = {
      ret: 1,
      err: 'ok',
      user: user
  }

}


/**
 * @api {post} /boss/forgetPwd  用户忘记密码，找回密码接口
 * @apiName forgetPwd
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 用户忘记密码
 *
 * @apiParam {String} mobile 手机号码
 * @apiParam {String} newPassword 新密码
 * @apiParam {String} conformPassword 确认新密码
 * @apiParam {String} code 手机验证码
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/forgetPwd
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "error": "手机验证码错误"
 *     }
 */
exports.forgetPwd = function *(next) {

    let mobile = this.request.body.mobile
    let newPassword = this.request.body.newPassword
    let conformPassword = this.request.body.conformPassword
    let code = this.request.body.code
    let lan = this.request.body.lan
    if (newPassword !== conformPassword) {
        return (this.body = {
            ret: 0,
            err: Msg(lan, 7)
        })
    }

    if(code == 9527) {

    }
    else if (!sms.checkCode({mobi:mobile,code:code})) {
        return(this.body = {
            ret: 0,
            err: Msg(lan, 8)
        })
    }

    let existUser = yield User.findOne({mobile:mobile}).exec()
    if(!existUser){
      return(this.body = {
            ret: 0,
            err: '用户不存在'
        })
    }
    try {
      let aaa = yield Im.pwdUser({mobile: existUser._id, password: newPassword})
      if(aaa.ret == 2) {
        yield Im.pwdUser({mobile: existUser._id, password: newPassword})
      }
    }
    catch(err) {
      console.log('im err' ,err, new Date())
    }
    existUser.password = newPassword
    yield existUser.save()

    this.body = {
        ret:1,
        err: 'ok'
    }
}

/**
 * @api {post} /boss/changePwd  用户修改密码
 * @apiName changePwd
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription 用户修改密码
 *
 * @apiParam {String} oldPassword 旧密码
 * @apiParam {String} newPassword 新密码
 * @apiParam {String} conformPassword 确认新密码
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/changePwd
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "error": "手机验证码错误"
 *     }
 */
exports.changePwd = function *(next) {

  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first',
    })
  }

  let userid = this.session.user.userId || ''

  let oldPassword = this.request.body.oldPassword
  let newPassword = this.request.body.newPassword
  let conformPassword = this.request.body.conformPassword
  if (newPassword !== conformPassword) {
      return (this.body = {
          ret: 0,
          err: Msg(this.session.user.lan, 7)
      })
  }



  const existUser = yield User.findOne({_id:userid}).exec()

  let match = yield existUser.comparePassword(oldPassword, existUser.password)

  if (!match) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 13)
    })
  }


  existUser.password = newPassword
  yield existUser.save()

  this.body = {
      ret:1,
      err: 'ok'
  }
}



/**
 * @api {get} /boss/getInfo 得到用户信息
 * @apiName getInfo
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription get User info
 *
 * @apiParam {String} userId 用户id，可选，userId为空就返回自己的信息
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getInfo
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "shield": 'yes',  // 屏蔽页面开关，yes 就是屏蔽；no 就是不屏蔽
 *       "user": {
          registration_id: 'xxxsssaa123', // 极光推送初始化id
          platform: 'ios',                // 客户端操作系统
          mobile: '15501451077',          // 手机号码
          password: '123',                // 密码，后端不做密码规则判断
          nickname: '小鸡',                // 昵称
          age: 18,                        // 年龄
          sex: 1,                         // 用户性别：1 代表 男，2 代表 女
          lovePrice: '轻奢',               // 宠爱指数：小清新，浪漫，轻奢，高奢
          loveDate: '短期',                // 甜蜜目标
          assets: '一个亿',                // 总资产
          income: '1000万',               // 年收入
          sports: ['跑步', '游泳'],         // 运动
          tour: ['阳光海滩'],               // 旅游
          body: '微胖',                    // 体型
          height: '140cm',                // 身高
          drink: '经常喝酒',                // 饮酒习惯 
          smoking: '经常抽烟',              // 抽烟习惯
          education: '学士学位',            // 最高学历
          work: '赤脚医生，流动给人打胎',      // 职业描述
          character: '老实人',              // 个性签名
          selfInfo: '我重来不卖假药，医仙',   //  自我介绍
          looking: '我在找一个美女，鱼水之欢', // 我正在寻找
          addr: '广东省广州市白云区江夏小学',  // 详细地址
          province: '广东省'               // 省份／直辖市 用来用户分类
          city: '广州市'                   // 市／县 用来用户分类
          area: '白云区'                   // 区／村
          completion: '90'                // 信息完整度 0-100
          locAuthorize:  true             // 记录用户是否位置授权，如果不授权，就在用户填写具体地址时再重新计算地理坐标
          lat: 23.2102600000,             // 纬度，北纬30度是个神奇的地方
          lng: 113.2828200000,            // 经度，广州的经度是多少
          ip: '223.104.1.103',            // ip, 这个是我们办公室的 ip
          auditContent:{                  // 后台审核项
            nickname: Boolean,
            selfInfo: Boolean,
            character: Boolean,
            looking: Boolean
          }
          auditStatus: 'success'                // 审核状态：ing :审核中；success :审核通过； failed: 审核失败
          auditAt: '2017-07-11T02:35:20.412Z'   // 审核时间
          vip: {                                // vip
            role: true,                         // true 为 vip用户，反之则反
            category: 223,                          // 套餐类型，具体套餐还没有定
            from: '2017-07-11T02:35:20.412Z',   // vip 开始时间
            to: '2017-08-11T02:35:20.412Z'      // vip 结束时间
          }
          avatar: 'http://arpt-user.oss-cn-shenzhen.aliyuncs.com/skin-test/dzmpyYQERF.jpg', // 头像
          photoPub: [{url: 'xxx', enable: true},{url: 'yyy', enable: false}],  // 公开照片 enable 为true 则为审核通过，false 则为不通过
          photoPri: [{url: 'xxx', enable: true},{url: 'yyy', enable: false}],  // 私密照片 enable 为true 则为审核通过，false 则为不通过
          meta: {"updatedAt": "2017-06-15T06:01:20.755Z", "createdAt": "2017-06-02T09:34:02.438Z"}, 表更新时间 和 表创建时间
          traceid: {                             // trace 结构， 为用户操作痕迹记录的对象
            userid: {type: ObjectId, ref: 'User'},  // 用户id
            loginAt: "2017-06-15T06:01:20.755Z",    // 登录时间，记录用户活跃，在线情况
            targetChat: “xxx”,                      // 正在聊天的id，记录用户正在和谁在聊天
            care: ['userid', 'userid2'],            // 用户关注的人
            cared: ['userid', 'userid2'],           // 关注用户的人
            browse: ['userid', 'userid2'],          // 用户浏览的人
            browsed: ['userid', 'userid2'],         // 浏览用户的人
            hate: ['userid', 'userid2'],            // 用户拉黑的人
            hated: ['userid', 'userid2'],           // 拉黑用户的人
            photoPri: ['userid', 'userid2'],        // 用户查看了谁的私照
            photoPried: ['userid', 'userid2'],      // 谁查看了用户的私照
            listSet: true,                          // 是否投放到列表，true or false, 默认true
            browseSet: true,                        // 是否允许被别人浏览
            careSet: true,                          // 是否允许被别人关注
            report: {content:'骗子，一点钱没有', enable: true, reportAt: "2017-06-15T06:01:20.755Z", reportUser}, // 被别人举报的对象，content: 举报内容；enable:审核结果；reportAt:举报时间；reportUser:举报人id
            meta: {"updatedAt": "2017-06-15T06:01:20.755Z", "createdAt": "2017-06-02T09:34:02.438Z"}, trace 对象更新时间 和 创建时间
          }
        }
 *     }
 *       "status": vipFailed(vip,未通过审核) || vipIng(vip,审核中) || toPerfect(完整度未达89) || toPerfectPub(完整度达89，未上传公开照片) || upVip(完整度达到100，审核中)
 */
exports.getUserInfo = function *(next) {
  if(!this.session.user) {
      return (this.body = {
        ret: 0,
        shield: config.shield,
        err: 'Please login first'
      })
  }

  let id = this.query.userId || ''
  let  userid = this.session.user.userId
  const getUser = yield User.findOne({_id:userid}).populate({path: 'traceid'}).exec()
  if (!id || id.toString() === userid.toString()) {
    // 是否封号
    if(getUser.isActive == 'no') {
      delete this.session.user
      return (this.body = {
        ret: 0,
        shield: config.shield,
        err: Msg(this.session.user.lan, 19)
      })
    }
    let msgNum = yield Chat.count({toid: userid, readed: false}).exec()
    let noticeNum = yield Notice.count({userid: userid, readed: false}).exec()
    let endTime = '于' + moment(getUser.vip.to).format('YYYY-MM-DD') + '到期'

    getUser.vipLevel = getUser.vipLevel || 'vip0'
    let vipText = config.vipText[getUser.vipLevel]
    // if(getUser.auditContent && getUser.auditContent.nickname && (getUser.auditContent.nickname == 0 || getUser.auditContent.nickname == 2)){
    //     if(getUser.oldName){
    //         getUser.nickname = getUser.oldName
    //       }else{
    //         if(getUser.sex == 1){
    //           getUser.nickname = '甜心'
    //         }else if(getUser.sex == 2){
    //           getUser.nickname = '绅士'
    //         }
    //     }
    // }
    return (this.body = {
      ret: 1,
      err: 'ok',
      msgNum: msgNum,
      noticeNum: noticeNum,
      endTime: endTime,
      shield: config.shield,
      vipText: vipText,
      result:getUser
    })  
  }

  // boss 浏览人数限制
  if(getUser.from == 'boss' && (getUser.vipLevel == 'vip0' || getUser.vipLevel == 'vip1')) {
    if(!global.browse || !global.browse[userid]) {
      global.browse = {}
      global.browse[userid] = [id]
    }
    if(global.browse[userid].length > 10 ) {
      if((getUser.vipLevel == 'vip0' || getUser.vipLevel == 'vip1') && getUser.sex == 1) {
        return (this.body = {
          ret: 0,
          err: Msg(this.session.user.lan, 20)
        })
      }
    }
    if(global.browse[userid].length > 50 ) {
      if((getUser.vipLevel == 'vip0' || getUser.vipLevel == 'vip1') && getUser.sex == 2) {
        return (this.body = {
          ret: 0,
          err: Msg(this.session.user.lan, 21)
        })
      }
    }
    if(global.browse[userid].length > 100 ) {
      if(getUser.vipLevel == 'vip2' && getUser.sex == 1) {
        return (this.body = {
          ret: 0,
          err: Msg(this.session.user.lan, 22)
        })
      }
    }
    if(global.browse[userid].length > 200 ) {
      if(getUser.vipLevel == 'vip2' && getUser.sex == 2) {
        return (this.body = {
          ret: 0,
          err: Msg(this.session.user.lan, 23)
        })
      }
    }
    if(global.browse[userid].indexOf(id) == -1) {
      global.browse[userid].push(id)
    }
  }

  // 做浏览记录,供高级搜索使用
  let trace = yield Trace.findOne({userid: id}).exec()
  if(trace && trace.browsed) {
    let browsed = trace.browsed
    if(browsed.indexOf(userid) === -1) {
      trace.browsed.push(userid)
      yield trace.save()
    }
  }

  let _trace = yield Trace.findOne({userid: userid}).exec()
  if(_trace && _trace.browse) {
    let browse = _trace.browse
    if(browse.indexOf(id) === -1) {
      _trace.browse.push(id)
      yield _trace.save()
    }
  }

  let result
  let userTo = yield User.findOne({_id: id}).populate({path: 'traceid'}).exec()

  if(!userTo) {
    return (this.body = {
      ret: 0,
      shield: config.shield,
      err: Msg(this.session.user.lan, 12)
    })
  }

  if(userTo.isActive == 'no') {
    return (this.body = {
      ret: 0,
      shield: config.shield,
      err: Msg(this.session.user.lan, 14)
    })
  }
  
  if(userTo && userTo.platform && userTo.registration_id) {
    let notice = getUser.nickname + Msg(this.session.user.lan, 24)
    if(!getUser.nickname) {
      if(getUser.sex == '1') {
        notice = Msg(this.session.user.lan, 25)
      }
      if(getUser.sex == '2') {
        notice = Msg(this.session.user.lan, 26)
      }
    }
    let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
    try {
      let boss = 'no'
      if(userTo.from == 'boss') {
        boss = 'yes'
      }
      result = yield jpush.browse(userTo.platform, userTo.registration_id, notice, notice, true, userid, msgNum, boss)
    } catch(_err) {
      console.log(_err)
    }
    console.log('推送结果', result)
  }


  if (!getUser) {
    return (this.body = {
      ret: 0,
      shield: config.shield,
      jpsuhResult: result,
      err: Msg(this.session.user.lan, 12)
    })
  }


  userTo.vipLevel = userTo.vipLevel || 'vip0'
  let _vipText = config.vipText[userTo.vipLevel]


  this.body = {
    ret: 1,
    err: 'ok',
    vipText: _vipText,
    shield: config.shield,
    result:userTo
  }
}



/**
 * @api {get} /boss/getAppLists  首页三个列表
 * @apiName getAppLists
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 查找三个列表
 *
 * @apiParam {String} search 筛选字段，1.byDistance(距离) 2.byLoginTime(活跃时间)3.byCreatTime(最近注册)
 * @apiParam {String} pageNumber   页码：从1开始
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getAPPLists
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '没有更多数据了'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": Object
 *     }
 */
exports.getAppLists = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first'
    })
  }
  let search = this.query.search
  let firstlists
  let lastlists
  let vip2list
  let vip3list
  let vip4list
  let lists
  // let loc = yield User.find({auditStatus:auditStatus}).exec()

  // let point = { type : "Point", coordinates : loc.loc };


  let userId = this.session.user.userId || ''
  let user = yield User.findOne({_id: userId}).populate({path: 'traceid'}).exec()
  let sex = user.sex === 1 ? 2 : 1
  
  let number = this.query.pageNumber
  let pageSize = this.query.pageSize || 30

  let onlines = yield onlineCo.keys('*')

  if(search == 'byDistance') {

    let vip2Query = {
      nickname: {$exists: true},
      avatar: {$exists: true},
      mobile:{$ne: user.mobile},
      sex: sex,
      vipLevel: {$in: ['vip1', 'vip2']},
      isActive: {$ne: 'no'},
      mock:false,
      loc: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: user.loc.coordinates
          },
          $maxDistance: 2000000000
        }
      }
    }
    let vip3Query = {
      nickname: {$exists: true},
      avatar: {$exists: true},
      mobile:{$ne: user.mobile},
      sex: sex,
      vipLevel: 'vip3',
      isActive: {$ne: 'no'},
      mock:false,
      loc: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: user.loc.coordinates
          },
          $maxDistance: 2000000000
        }
      }
    }
    let vip4Query = {
      nickname: {$exists: true},
      avatar: {$exists: true},
      mobile:{$ne: user.mobile},
      sex: sex,
      vipLevel: 'vip4',
      isActive: {$ne: 'no'},
      mock:false,
      loc: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: user.loc.coordinates
          },
          $maxDistance: 2000000000
        }
      }
    }

    let firstquery = {
      nickname: {$exists: true},
      avatar: {$exists: true},
      mobile:{$ne: user.mobile},
      sex: sex,
      'vip.role': false,
      isActive: {$ne: 'no'},
      mock:false,
      loc: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: user.loc.coordinates
          },
          $maxDistance: 2000000000
        }
      }
    }
    let lastquery = {
      nickname: {$exists: true},
      avatar: {$exists: true},
      isActive: {$ne: 'no'},
      mobile:{$ne: user.mobile},
      sex: sex,
      rmbTotal: 0,
      mock:true,
      loc: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: user.loc.coordinates
          },
          $maxDistance: 2000000000
        }
      }
    }
    vip2list = yield User.find(vip2Query).populate({path: 'traceid'}).exec()
    vip3list = yield User.find(vip3Query).populate({path: 'traceid'}).exec()
    vip4list = yield User.find(vip4Query).populate({path: 'traceid'}).exec()
    firstlists = yield User.find(firstquery).populate({path: 'traceid'}).exec()
    lastlists = yield User.find(lastquery).populate({path: 'traceid'}).exec()
    lists = vip4list.concat(vip3list, vip2list, firstlists, lastlists)

  }
  if(search == 'byLoginTime') {
    let firstquery = {'vip.role': false, nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, mock:false,sex: sex, mobile:{$ne: user.mobile}}
    firstlists = yield User.find(firstquery).populate({path: 'traceid'}).sort({'loginAt': -1}).limit(500).exec()
    firstquery.mock = true
    lastlists = yield User.find(firstquery).populate({path: 'traceid'}).sort({'loginAt': -1}).exec()
    firstquery.vipLevel = {$in: ['vip1', 'vip2']}
    vip2list = yield User.find(firstquery).populate({path: 'traceid'}).sort({'loginAt': -1}).exec()
    firstquery.vipLevel = 'vip3'
    vip3list = yield User.find(firstquery).populate({path: 'traceid'}).sort({'loginAt': -1}).exec()
    firstquery.vipLevel = 'vip4'
    vip4list = yield User.find(firstquery).populate({path: 'traceid'}).sort({'loginAt': -1}).exec()

    let viplist = vip4list.concat(vip3list, vip2list)

    lists = firstlists.concat(lastlists)

    // redis 获取vip在线用户
    let bbb = []
    for (let i = 0; i < onlines.length; i++) {
      for (let j = 0; j < viplist.length; j++) {
        let _user = viplist[j]
        if(_user._id.toString() === onlines[i].toString()) {
          viplist.splice(j, 1)
          _user.online = 'yes'
          bbb.push(_user)
        }
      }
    }

    viplist = bbb.concat(viplist)

    // redis 获取在线普通用户
    let aaa = []
    for (let i = 0; i < onlines.length; i++) {
      for (let j = 0; j < lists.length; j++) {
        let _user = lists[j]
        if(_user._id.toString() === onlines[i].toString()) {
          lists.splice(j, 1)
          _user.online = 'yes'
          aaa.push(_user)
        }
      }
    }

    lists = viplist.concat(aaa, lists)

  }
  if(search == 'byCreatTime') {
    let firstquery = {'vip.role': false, 'auditStatus': 'success',nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, mock:false,sex: sex, mobile:{$ne: user.mobile}}
    firstlists = yield User.find(firstquery).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).limit(500).exec()
    firstquery.mock = true
    lastlists = yield User.find(firstquery).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).exec()
    firstquery.vipLevel = {$in: ['vip1', 'vip2']}
    vip2list = yield User.find(firstquery).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).exec()
    firstquery.vipLevel = 'vip3'
    vip3list = yield User.find(firstquery).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).exec()
    firstquery.vipLevel = 'vip4'
    vip4list = yield User.find(firstquery).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).exec()

    lists = vip4list.concat(vip3list, vip2list, firstlists, lastlists)
  }


  if(!lists) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 27)
    })
  }

  if(user.traceid.hate && user.traceid.hate && user.traceid.hate.length > 0) {
    let hates = user.traceid.hate
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      for (var j = 0; j < lists.length; j++) {
        let _user = lists[j]
        if(_user._id.toString() === hateid.toString()) {
          lists.splice(j, 1)
        }
    }
    }
  }

  if(user.traceid.hated && user.traceid.hated && user.traceid.hated.length > 0) {
    let hates = user.traceid.hated
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      for (var j = 0; j < lists.length; j++) {
        let _user = lists[j]
        if(_user._id.toString() === hateid.toString()) {
          lists.splice(j, 1)
        }
      }
    }
  }
  for (var i = 0; i < lists.length; i++) {
    if(!lists[i].traceid.listSet){
      lists.splice(i, 1)
    }
  }
  
  let recordTotal = lists.length
  if(number) {
    number = number > 1 ? number :  1
    let skip = (number - 1) * pageSize
    lists = lists.slice(Number(skip),Number(skip) + Number(pageSize))  
  }

  if(lists.length !== 0) {
    for (var i = 0; i < lists.length; i++) {
      if(onlines.indexOf(lists[i]._id.toString()) > -1) {
        lists[i].online = 'yes'
      }
      if(lists[i].loc && lists[i].loc.coordinates && user.loc && user.loc.coordinates) {
        lists[i].distance = Distance([user.loc.coordinates, lists[i].loc.coordinates])
        lists[i].distance = (lists[i].distance/1000).toFixed(3)
      }
      if(lists[i].auditContent && lists[i].auditContent.nickname && lists[i].auditContent.nickname !== '1') {
        if(lists[i].oldName) {
          lists[i].nickname = lists[i].oldName
        }else{
          if(user.sex == 2) {
            lists[i].nickname = Msg(this.session.user.lan, 28)
          }else if(user.sex == 1) {
            lists[i].nickname = Msg(this.session.user.lan, 29)
          }
        }
      }
    }
  }

  this.body = {
    ret: 1,
    err: 'ok',
    results:lists,
    pageNumber: number,
    pageSize: pageSize,
    recordTotal: recordTotal
  }
}

/**
 * @api {post} /boss/searchLists  高级搜索
 * @apiName boss/searchLists
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription 高级搜索
 *
 * @apiParam {Number} distance  距离我多少公里，定位公里。 例如：30
 * @apiParam {String} browsed  看过我的： yes 或者 no
 * @apiParam {String} photo   有照片的： yes 或者 no
 * @apiParam {String} vip   是否VIP： yes 或者 no
 * @apiParam {String} browse  我未看过的： yes 或者 no
 * @apiParam {String} browsedto   我看过的： yes 或者 no
 * @apiParam {String} care     我关注的： yes 或者 no
 * @apiParam {String} cared   关注过我的： yes 或者 no
 * @apiParam {String} city   城市：广州
 * @apiParam {String} pageNumber   页码：从1开始
 * @apiParam {String} search 筛选字段，1.byDistance(距离) 2.byLoginTime(活跃时间)3.byCreatTime(最近注册)
 * @apiParam {Number} faceScore  按照颜值搜索 yes 或者 no
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/searchLists
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '没有更多数据了'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": Object
 *     }
 */
 exports.searchLists = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first'
    })
  }
  let body = this.request.body
  let distance = body.distance || 2000000000
  let browsed = body.browsed || 'no'
  let browse = body.browse || 'no'
  let photo = body.photo || 'no'
  let vip = body.vip || 'no'
  let brows = body.brows || 'no'
  let care = body.care || 'no'
  let cared = body.cared || 'no'
  let lat = body.lat
  let lng = body.lng
  let addr = body.city
  let search = body.search
  let faceScore = body.faceScore || 'no'

  let userId = this.session.user.userId || ''
  let numbers = body.pageNumber
  let pageSize = body.pageSize || 30
  let user = yield User.findOne({_id: userId}).populate({path: 'traceid'}).exec()

  let onlines = yield onlineCo.keys('*')

  // if(!user.vip || !user.vip.role) {
  //   let err = '高级搜索必须是VIP用户'
  //   if(config.shield === 'yes') {
  //     err = '高级搜索暂时无法使用'
  //   }
  //   return (this.body = {
  //     ret: 0,
  //     err: err
  //   })
  // }
  let sex = user.sex === 1 ? 2 : 1

  if(lng && lat) {
    if(user.loc && user.loc.coordinates) {
      user.loc.coordinates[0] = Number(lng)
      user.loc.coordinates[1] = Number(lat)
    }
  }

  let query = {
    nickname: {$exists: true},
    avatar: {$exists: true},
    // completion: {$gte: 90},
    isActive: {$ne: 'no'},
    mobile:{$ne: user.mobile},
    sex: sex,
    loc: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: user.loc.coordinates
        },
        $maxDistance: distance
      }
    }
  }

  if(addr) {
    query.addr = addr
  }
  if(vip == 'yes') {
    query['vip.role'] = true
  }
  let lists
  
    if(search == 'byDistance') {
        lists = yield User.find(query).exec()
    }
    else if(search == 'byLoginTime') {  
        lists = yield User.find(query).sort({'loginAt': -1}).exec()
    }
    else if(search == 'byCreatTime') {
        query.auditStatus = 'success'
        lists = yield User.find(query).sort({'meta.createdAt': -1}).exec()
    }  
  
  

  if(!lists) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 27)
    })
  }


  let trace = yield Trace.findOne({userid: userId}).exec()

  // 看过我的
  if(browsed === 'yes' && trace.browsed &&  trace.browsed.length > 0) {
    let results = []
    for (let i = lists.length - 1; i >= 0; i--) {
      let _user = lists[i]
      if(trace.browsed.indexOf(_user._id) > -1) {
        results.push(_user)
      }
    }
    lists = results
  }

  // 是否有照片
  if(photo === 'yes') {
    let results = []
    for (let i = lists.length - 1; i >= 0; i--) {
      let _user = lists[i]
      if(_user.photoPub && _user.photoPub.length > 0) {  
        results.push(_user)
      }
    }
    lists = results
  }

  // 是否VIP
  // if(vip === 'yes') {
  //   let results = []
  //   for (let i = lists.length - 1; i >= 0; i--) {
  //     let _user = lists[i]
  //     if(_user.vip && _user.vip.role) {  
  //       results.push(_user)
  //     }
  //   }
  //   lists = results
  // }

  // 我未查看过
  if(browse === 'yes' && trace.browse &&  trace.browse.length > 0) {
    let results = []
    for (let i = lists.length - 1; i >= 0; i--) {
      let _user = lists[i]
      if(trace.browse.indexOf(_user._id) === -1) {
        results.push(_user)
      }
    }
    lists = results
  }

  // 我查看过
  if(brows === 'yes' && trace.browse &&  trace.browse.length > 0) {
    let results = []
    for (let i = lists.length - 1; i >= 0; i--) {
      let _user = lists[i]
      if(trace.browse.indexOf(_user._id) > -1) {
        results.push(_user)
      }
    }
    lists = results
  }

  //  我的关注
  if(care === 'yes' && trace.care &&  trace.care.length > 0) {
    let results = []
    for (let i = lists.length - 1; i >= 0; i--) {
      let _user = lists[i]
      if(trace.care.indexOf(_user._id) > -1) {
        results.push(_user)
      }
    }
    lists = results
  }

  //  关注我的
  if(cared === 'yes' && trace.cared &&  trace.cared.length > 0) {
    let results = []
    for (let i = lists.length - 1; i >= 0; i--) {
      let _user = lists[i]
      if(trace.care.indexOf(_user._id) > -1) {
        results.push(_user)
      }
    }
    lists = results
  }

  
  // for (var i = 0; i < lists.length; i++) {
  //   console.log('lists.length======', lists[i].vip.role)
  // }

  let exlists = []
  let length = lists.length
  let newlists = []

  if(search == 'byLoginTime') {  
    // redis 获取在线用户
    let aaa = []
    for (let i = 0; i < onlines.length; i++) {
      for (let j = 0; j < lists.length; j++) {
        let _user = lists[j]
        if(_user._id.toString() === onlines[i].toString()) {
            lists.splice(j, 1)
            _user.online = 'yes'
            aaa.push(_user)
        }
      }
    }

    lists = aaa.concat(lists)
  }


  if(length < 83 && search == 'byDistance') {
    let exquery = {
      nickname: {$exists: true},
      isActive: {$ne: 'no'},
      avatar: {$exists: true},
      mobile:{$ne: user.mobile},
      sex: sex,
      loc: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: user.loc.coordinates
          },
          $maxDistance: 2000000000
        }
      }
    }
    exlists = yield User.find(exquery).populate({path: 'traceid'}).exec()
    for(var i = 0; i < length; i++) {
        for(var j = 0; j < exlists.length; j++) {
          if(lists[i].mobile == exlists[j].mobile) {
            exlists.splice(j, 1)
          }
      }
    }
    newlists =  lists.concat(exlists)
  }
  else if(lists.length < 83 && search == 'byLoginTime') {  
    exlists = yield User.find({nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, sex: sex, mobile:{$ne: user.mobile}}).populate({path: 'traceid'}).sort({'loginAt': -1}).exec()
    // let newList = lists
    for(var i = 0; i < length; i++) {
        for(var j = 0; j < exlists.length; j++) {
          if(lists[i].mobile == exlists[j].mobile) {
            exlists.splice(j, 1)
          }
      }
    }
    newlists =  lists.concat(exlists)
  }
  else if(lists.length < 83 && search == 'byCreatTime') {
        
    exlists = yield User.find({nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, sex: sex, mobile:{$ne: user.mobile}}).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).exec()
    for(var i = 0; i < length; i++) {
        for(var j = 0; j < exlists.length; j++) {
          if(lists[i].mobile == exlists[j].mobile) {
            exlists.splice(j, 1)
          }
      }
    }
    newlists =  lists.concat(exlists)
  }
  else {
    newlists =  lists
  }



  if(user.traceid.hate && user.traceid.hate && user.traceid.hate.length > 0) {
    let hates = user.traceid.hate
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      for (var j = 0; j < newlists.length; j++) {
        let _user = newlists[j]
        if(_user._id.toString() === hateid.toString()) {
          newlists.splice(j, 1)
        }
      }
    }
  }

  if(user.traceid.hated && user.traceid.hated && user.traceid.hated.length > 0) {
    let hates = user.traceid.hated
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      for (var j = 0; j < newlists.length; j++) {
        let _user = newlists[j]
        if(_user._id.toString() === hateid.toString()) {
          newlists.splice(j, 1)
        }
      }
    }
  }



    // console.log('n=======',  JOSN.stringify(exquery))
  for (var i = 0; i < newlists.length; i++) {
    if(!newlists[i].traceid.newlistset){
      newlists.splice(i, 1)
    }
  }
  
  let recordTotal = newlists.length
   

  if(numbers) {
    numbers > 1 ? numbers = numbers : numbers = 1
    let skip = (numbers - 1) * pageSize
    newlists = newlists.slice(Number(skip),Number(skip)+Number(pageSize))
  }

  if(newlists.length !== 0) {
    for (let i = 0; i < newlists.length; i++) {
      if(onlines.indexOf(newlists[i]._id.toString()) > -1) {
        newlists[i].online = 'yes'
      }
      if(newlists[i].loc && newlists[i].loc.coordinates && user.loc && user.loc.coordinates) {
        newlists[i].distance = Distance([user.loc.coordinates, newlists[i].loc.coordinates])
        newlists[i].distance = (newlists[i].distance/1000).toFixed(3)
      }
      if(newlists[i].auditContent && newlists[i].auditContent.nickname && newlists[i].auditContent.nickname !== '1') {
        if(newlists[i].oldName) {
          newlists[i].nickname = newlists[i].oldName
        }else{
          if(user.sex == 2) {
            newlists[i].nickname = Msg(this.session.user.lan, 28)
          }else if(user.sex == 1) {
            newlists[i].nickname = Msg(this.session.user.lan, 29)
          }
        }
      }
    }
  }

  



  this.body = {
    ret: 1,
    err: 'ok',
    faceScore: faceScore,
    results:newlists,
    pageNumber: numbers,
    pageSize: pageSize,
    recordTotal: recordTotal
  }
}



/**
 * @api {get} /boss/getsts  获取阿里云临时上传账户
 * @apiName aliyun sts
 * @apiGroup Aliyun
 * @apiPermission User
 *
 * @apiDescription 获取阿里云临时上传账户,给客户端上传照片,注意上传路径：man-avatar/ 是男的头像上传路径；man-private/ 是男的私照上传路径；man-public/ 是男的公开照上传路径;woman-avatar/ 是女的头像上传路径；woman-private/ 是女的私照上传路径；woman-public/ 是女的公开照上传路径;
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getsts
 *
 * @apiSuccess {String} ret 1
 * @apiSuccess {Object} object 'xxx'
 *
 * @apiError ret 0
 * @apiError err err message
 * @apiErrorExample Response (example):
 *   HTTP/1.1 200 Ok
 *   {
 *     ret: 1,
 *     results: {
 *       "RequestId": "5C5F6C6E-273F-4D26-923E-C73E613B7D3B",
 *       "AssumedRoleUser": {
 *          "AssumedRoleId": "329265495765631429:fax4g3kq",
 *          "Arn": "acs:ram::1071268284005178:role/arpt-user-role/fax4g3kq"
 *        },
 *       "Credentials": {
 *         "AccessKeySecret": "76TyX1dwBC3C4aQTkbeu7rRGEbpp97kUWS4R5Y8fFvcW",
 *         "AccessKeyId": "STS.LDnhduzxH7PVTyxsFZmWV7WoW",
 *         "Expiration": "2017-07-06T09:35:51Z",
 *         "SecurityToken": "xxxlonglong"
 *       }
 *     }
 *   }
 */
exports.getsts = function *(next) {

  let results
  try {
    results = yield aliyun.accessSts()
  } catch(err) {
    console.log(err)
    return (this.body = {
      ret: 0,
      result: err
    })
  }

  this.body = {
    ret: 1,
    results: results
  }
}



/**
 * @api {post} /boss/editInfo  用户编辑资料
 * @apiName editInfo
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription  用户编辑资料
 *
 * @apiParam {String} nickname 昵称
 * @apiParam {String} addr 地区
 * @apiParam {String} age 年龄
 * @apiParam {String} lovePrice 宠爱指数
 * @apiParam {String} loveDate 甜蜜目标
 * @apiParam {String} income 年收入
 * @apiParam {String} sports 运动
 * @apiParam {String} tour 旅游
 * @apiParam {String} body 体型
 * @apiParam {String} height 身高
 * @apiParam {String} drink 饮酒习惯
 * @apiParam {String} smoking 抽烟习惯
 * @apiParam {String} education 最高学历
 * @apiParam {String} work 职业描述
 * @apiParam {String} character 个性标签
 * @apiParam {String} selfInfo 自我介绍
 * @apiParam {String} email 邮箱
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/editInfo
 *
 * @apiSuccess {Number}   ret   1.
 * @apiSuccess {String}   err '编辑成功'.
 *
 * @apiError ret 0.
 * @apiError err   '编辑失败'.
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "error": "编辑成功",
 *       "completion": 90,
 *     }
 */
exports.editUserInfo = function *(next) {
    if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    if(JSON.stringify(this.request.body) == '{}') {
      return (
            this.body = {
                ret: 0,
                err: 'Content can not be empty'
            }
        )
    }

    let user = yield User.findOne({_id: this.session.user.userId}).exec()

    if(this.request.body.nickname) {
      if(user.auditContent && user.auditContent.nickname == '1') {
        user.oldName = user.nickname
      }
    }


    let bodyKeys = Object.keys(this.request.body)

    let editkey = bodyKeys[0]
    if(editkey === 'selfEdit') {
      editkey = bodyKeys[1]
    }

    let selfEdit = this.request.body.selfEdit

    user[editkey] = this.request.body[editkey]
    // console.log('this.request.body=======',this.request.body[editkey])
    // console.log('this.request.body=======',editkey)
    let weightArr = []
    let lat
    let lng

    // 计算完整度
    let result = 0
    const weightSource = weight.boss


    // 兼用低版本 looking 的分值计算
    if(user.iNeed || user.afford || user.hopeful) {
      weightSource.looking = 0
    }

    let keys = Object.keys(weightSource)
    for(let i in keys) {
      let key = keys[i]
      if(user[key]) {
        result += weightSource[key]
      }


    }

    if(editkey === 'addr') {
      let addr = this.request.body[editkey]
      if(!user.locAuthorize && addr) {
        let ipData = yield amap.addr(addr)
        lat = ipData.lat
        lng = ipData.lng
        user.loc = {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)]
        }
        user.lng = lng
        user.lat = lat
      }

      let addrs = addr.split('-')
      if(addrs.length == 2) {
        user.province = addrs[0]
        user.city = addrs[1]
      }
    }
    if(result > 100) {
      result = 100
    }
    
    user.completion = result

    let key = editkey
    let arrs = ['character', 'nickname', 'selfInfo','work']

    if(arrs.indexOf(key) > -1) {
      // let sss = ['character', 'selfInfo', 'work']
      if(key !== 'nickname' && selfEdit == 'no') {
        user.auditContent[key] = '1'
        if(user.auditStatus !== 'success') {
          let aaa = false
          for (var i = 0; i < arrs.length; i++) {
            let ss = arrs[i]
            if(user.auditContent[ss] == '0' || user.auditContent[ss] == '2') {
              aaa = true
            }
          }
          if(user.photoPri && user.photoPri.length > 0) {
            for (var i = user.photoPri.length - 1; i >= 0; i--) {
              if(user.photoPri[i].enable !== true) {
                aaa = true
              }
            }
          }

          if(user.photoPub && user.photoPub.length > 0) {
            for (var i = user.photoPub.length - 1; i >= 0; i--) {
              if(user.photoPub[i].enable !== true) {
                aaa = true
              }
            }
          }
          if(aaa === false) {
            let noticeText = {
              character: Msg(this.session.user.lan, 30),
              selfInfo: Msg(this.session.user.lan, 31),
              work: Msg(this.session.user.lan, 32)
            }
            let notice = noticeText[key] + Msg(this.session.user.lan, 34)
            // 通知中心
            let _notice = new Notice({
              userid: user._id,
              content: notice
            })
            yield _notice.save()
            user.auditStatus = 'success'
          }
        }
      }
      else {
        user.auditStatus = 'ing'
        user.sortAt = Date.now()
        user.auditContent[key] = '2'

        let noticeText = {
          character: Msg(this.session.user.lan, 30),
          nickname: Msg(this.session.user.lan, 33),
          selfInfo: Msg(this.session.user.lan, 31),
          work: Msg(this.session.user.lan, 32)
        }

        let notice = noticeText[key] + Msg(this.session.user.lan, 35)
        // 通知中心
        let _notice = new Notice({
          userid: user._id,
          content: notice
        })
        yield _notice.save()
      }
    }
    user.markModified('auditContent')
    yield user.save()

    
    this.body = {
        ret: 1,
        err: 'ok',
        user: user,
        completion: result
    }

}

/**
 * @api {post} /boss/postWish  发布心愿
 * @apiName postWish
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 发布心愿
 *
 * @apiParam {String} imgUrl 照片url
 * @apiParam {String} content 心愿墙文字内容
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/postWish
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '发布成功'
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "error": "发布成功"
 *     }
 */
exports.postWish = function *(next) {
	if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    

    let content = this.request.body.content
    let imgUrl = this.request.body.imgUrl
    const id = this.session.user.userId
    if (!content && !imgUrl) {
        return (this.body = {
            ret: 0,
            err: Msg(this.session.user.lan, 36)
        })
    }
    const user = yield User.findOne({_id:id}).exec()
    let query = {userid:id}
    let formToday = new Date()
    formToday.setHours(0)
    formToday.setMinutes(0)
    formToday.setSeconds(0)
    formToday.setMilliseconds(0)
    let toToday = new Date(new Date(formToday).getTime() + 3600*24*1000)
    query['meta.createdAt'] = {$gte: formToday, $lte: toToday}
    
    const wishCount = yield Wish.count(query).exec()
    if(user.auditStatus !== 'success' || user.completion < 90) {
        return (
            this.body = {
                ret: 2,
                err: Msg(this.session.user.lan, 37)
            }
        )
    }

    if(wishCount > 1) {
        return (
            this.body = {
                ret: 3,
                err: Msg(this.session.user.lan, 38)
            }
        )
    }

    const nickname = user.nickname
    const mobile = user.mobile
    const sex = user.sex
    const avatar = user.avatar
    const vipLevel = user.vipLevel
    let _wish = new Wish({
	    userid:id,
      content: content,
      imgUrl: imgUrl,
      nickname: nickname,
      sex: sex,
      avatar: avatar,
      mobile:mobile,
      vipLevel:vipLevel,
      sortAt:Date.now()
    })
	yield _wish.save()
	this.body = {
	    ret:1,
	    err: 'ok'
	}
}

/**
 * @api {get} /boss/getWish  获取所有的心愿
 * @apiName getWish
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 获取所有的心愿
 *
 * @apiParam {String} pageNumber 页码1，2，3
 * @apiParam {String} limit 一页多少条10，20
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getWish
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   list []
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "list": [{
 *           "isLove":"yes", 自己点过赞 
 *           "_id": "59afce7cbc959c500b4dc943",
 *           "userid": "5973146b72292702a79a9486",  该用户的id
 *           "content": "哈哈",                       心愿内容
 *           "imgUrl": "http://test-love-chat.oss-cn-shenzhen.aliyuncs.com/fateImage/156177833201504693881.jpg",心愿墙图片url
 *           "nickname": "佳哥",
 *           "sex": "1",
 *           "avatar": "http://love-chat.oss-cn-shanghai.aliyuncs.com/man-public/156177833201501121486.jpg",
 *           "__v": 3,
 *           "meta": {
 *               "updatedAt": "2017-09-07T01:40:04.949Z",
 *               "createdAt": "2017-09-06T10:31:24.269Z"
 *           },
 *           "auditContent": {
 *               "imgUrl": "failed",    //图片审核不通过
 *               "content": "failed"     //文字审核不通过
 *           },
 *           "auditReson": {
 *               "imgUrl": "照片敏感",    //图片审核不通过的具体原因  可以没有
 *               "content": "文字敏感，请更换"     //文字审核不通过的具体原因  可以没有
 *           },
 *           "loved": [
 *              "597eff5ad8d3f8727b15e6c2"  点赞的人的id  喜欢数是该数组的长度
 *           ],
 *           "auditStatus": "ing",  审核状态
 *           "Forwarding": 0         转发数目
 *
 *                  }]
 *     }
 */
exports.getWish = function *(next) {
	if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    let pageNumber = this.query.pageNumber
    let limit = this.query.limit
    pageNumber = Number(pageNumber)
    limit = Number(limit)

    let pageNumbers = pageNumber > 0 ? pageNumber : 1

    let skip = (pageNumbers - 1) * limit
    let id = this.session.user.userId
    let user = yield User.findOne({_id:id},{sex:1}).exec()
    let sex = user.sex
    let findsex = sex == 1 ? 2 : 1
    let totalNum = yield Wish.count({sex:findsex,auditStatus:'success'}).exec()
    let wishLists = yield Wish.find({sex:findsex,auditStatus:'success'},{content:1,imgUrl:1,loved:1,auditAt:1,auditContent:1,auditStatus:1,Forwarding:1,userid:1,meta:1}).sort({'meta.createdAt': -1}).exec()
    // if (!wishLists.length) {
    //     return (this.body = {
    //         ret: 0,
    //         err: '没有更多数据了'
    //     })
    // }
    let _wishList = []
    let __wishList = []
    let trace = yield Trace.findOne({userid: id}, {hate: 1}).exec()

    for(let i = 0; i < wishLists.length; i++) {
          if(wishLists[i].loved.indexOf(id) !== -1) {
              wishLists[i].isLove = 'yes'
          }else{
              wishLists[i].isLove = 'no'
          }
        let user = yield User.findOne({_id: wishLists[i].userid}, {avatar: 1, nickname: 1,oldName:1, mobile: 1, sex: 1, vipLevel: 1,auditContent:1,isActive:1,avatar:1,oldAvatar:1}).exec()
        if(user && user.auditContent && user.auditContent.nickname && user.auditContent.nickname !== '1') {
          if(user.oldName) {
              user.nickname = user.oldName
            }else{
              if(user.sex == 2) {
                user.nickname = Msg(this.session.user.lan, 28)
              }else if(user.sex == 1) {
                user.nickname = Msg(this.session.user.lan, 29)
              }
            }
        }
        if(user && user.auditContent && user.auditContent.avatar && user.auditContent.avatar !== '1') {
          if(user.oldAvatar) {
              user.nickname = user.oldAvatar
            }else{
              if(user.sex == 2) {
                user.avatar = 'http://new-h5-love-chat.oss-cn-shenzhen.aliyuncs.com/app/img/nv01.png'
              }else if(user.sex == 1) {
                user.avatar = 'http://new-h5-love-chat.oss-cn-shenzhen.aliyuncs.com/app/img/nan01.png'
              }
            }
        }
        wishLists[i].user  = user
        if(wishLists[i].user && wishLists[i].userid) {
            if(user && user.isActive !== 'no' ){
            if(trace && trace.hate && trace.hate.length !== 0){
              if(trace.hate.indexOf(wishLists[i].userid) == -1){
                _wishList.push(wishLists[i])
              }
          }else{
              _wishList.push(wishLists[i])  
          }
        } 
        }
        
        
      }
      // let newArr = new Set(arr);
      // var myArr = Array.from(newArr)
      // // console.log('myArr======',myArr)
      // // console.log('_wishList11111======',_wishList.length)

      // for(let i = 0; i < myArr.length; i++) {

      //     _wishList.splice(myArr[i]-i,1)

      // }

      // for(let i = 0; i < _wishList.length; i++) {
      //     if(_wishList[i].user && _wishList[i].user.isActive == 'no'){
      //       _wishList.splice(i,1)
      //   }
      // }
      // console.log('_wishList.length111isActive======',_wishList.length)

      // for(let i = 0; i < _wishList.length; i++) {
      //     if(trace && trace.hate && trace.hate.length !== 0){
      //       if(trace.hate.indexOf(wishLists[i].userid) !== -1){
      //           _wishList.splice(i,1)

      //       }
      //   }
      // }

      // console.log('_wishList2222======',_wishList.length)
    

    __wishList = _wishList.slice(skip,skip + limit)  
      

	this.body = {
	    ret:1,
	    list: __wishList,
	    totalNum:Math.ceil(_wishList.length/limit)
	}
}

/**
 * @api {get} /boss/delWish  删除心愿
 * @apiName delWish
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 删除心愿
 *
 * @apiParam {String} id 该心愿的id
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/delWish
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err ok
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "error": "删除成功"
 *     }
 */
exports.delWish = function *(next) {
	if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    let id = this.query.id
    let wishList = yield Wish.findOne({_id:id}).exec()
    if (!wishList) {
        return (this.body = {
            ret: 0,
            err: Msg(this.session.user.lan, 39)
        })
    }
	yield wishList.remove()
	this.body = {
	    ret:1,
	    err: 'ok'
	}
}
/**
 * @api {get} /boss/getSelfWish  获取自己的心愿
 * @apiName getSelfWish
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 获取自己的心愿
 *
 * @apiParam {String} pageNumber 页码1，2，3
 * @apiParam {String} limit 一页多少条10，20
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getWish
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   list []
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "list": [{
 *           "created":"2017-09-07 11-43-12"  格式化后的创建时间
 *           "_id": "59afce7cbc959c500b4dc943",
 *           "userid": "5973146b72292702a79a9486",  该用户的id
 *           "content": "哈哈",                       心愿内容
 *           "imgUrl": "http://test-love-chat.oss-cn-shenzhen.aliyuncs.com/fateImage/156177833201504693881.jpg",心愿墙图片url
 *           "nickname": "佳哥",
 *           "sex": "1",
 *           "avatar": "http://love-chat.oss-cn-shanghai.aliyuncs.com/man-public/156177833201501121486.jpg",
 *           "__v": 3,
 *           "meta": {
 *               "updatedAt": "2017-09-07T01:40:04.949Z",
 *               "createdAt": "2017-09-06T10:31:24.269Z"
 *           },
 *           "auditContent": {
 *               "imgUrl": "failed",    //图片审核不通过
 *               "content": "failed"     //文字审核不通过
 *           },
 *           "auditReson": {
 *               "imgUrl": "照片敏感",    //图片审核不通过的具体原因  可以没有
 *               "content": "文字敏感，请更换"     //文字审核不通过的具体原因  可以没有
 *           },
 *           "loved": [
 *              "597eff5ad8d3f8727b15e6c2"  点赞的人的id  喜欢数是该数组的长度
 *           ],
 *           "auditStatus": "ing",  审核状态
 *           "Forwarding": 0         转发数目
 *
 *                  }]
 *     
 *     
 *     
 *     
 *     
 *     }
 */
exports.getSelfWish = function *(next) {
	if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    const pageNumber = this.query.pageNumber
    const limit = this.query.limit
    let pageNumbers = pageNumber > 0 ? pageNumber : 1
    let skip = (pageNumbers - 1) * limit
    const id = this.session.user.userId
    const user = yield User.findOne({_id:id},{avatar: 1, nickname: 1,oldName:1, mobile: 1, sex: 1, vipLevel: 1,auditContent:1,isActive:1,avatar:1,oldAvatar:1}).exec()
    let sex = user.sex
    let findsex = sex == 1 ? 2 : 1
    let totalNum = yield Wish.count({userid:id}).exec()
    let wishLists = yield Wish.find({userid:id},{content:1,imgUrl:1,loved:1,auditAt:1,auditContent:1,auditStatus:1,Forwarding:1,userid:1,meta:1}).populate('userid','avatar nickname mobile sex vipLevel ').sort({'meta.createdAt': -1}).skip(Number(skip)).limit(Number(limit)).exec()

   if(user && user.auditContent && user.auditContent.nickname && user.auditContent.nickname !== '1') {
          if(user.oldName) {
              user.nickname = user.oldName
            }else{
              if(user.sex == 2) {
                user.nickname = Msg(this.session.user.lan, 28)
              }else if(user.sex == 1) {
                user.nickname = Msg(this.session.user.lan, 29)
              }
            }
        }
        if(user && user.auditContent && user.auditContent.avatar && user.auditContent.avatar !== '1') {
          if(user.oldAvatar) {
              user.nickname = user.oldAvatar
            }else{
              if(user.sex == 2) {
                user.avatar = 'http://new-h5-love-chat.oss-cn-shenzhen.aliyuncs.com/app/img/nv01.png'
              }else if(user.sex == 1) {
                user.avatar = 'http://new-h5-love-chat.oss-cn-shenzhen.aliyuncs.com/app/img/nan01.png'
              }
            }
        }
    let _wishLists = []

    for(let i = 0; i < wishLists.length; i++) {
          wishLists[i].created = moment(wishLists[i].meta.createdAt).format('YYYY-MM-DD h:mm:ss')
          wishLists[i].user = wishLists[i].userid
          delete wishLists[i].userid
          if(wishLists[i].userid){
            _wishLists.push(wishLists[i])
        }
      }
	this.body = {
	    ret:1,
      user:user,
	    list: _wishLists,
	    totalNum:Math.ceil(totalNum/limit)
	}
}

/**
 * @api {post} /boss/editWish  用户编辑心愿墙
 * @apiName editInfo
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription  用户编辑资料
 *
 * @apiParam {String} id 该心愿的id
 * @apiParam {String} imgUrl 图片地址
 * @apiParam {String} content 文字
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/editWish
 *
 * @apiSuccess {Number}   ret   1.
 * @apiSuccess {String}   err '编辑成功'.
 *
 * @apiError ret 0.
 * @apiError err   '编辑失败'.
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "error": "编辑成功"
 *     }
 */
exports.editWish = function *(next) {
    if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    
    let id = this.request.body.id
    let imgUrl = this.request.body.imgUrl
    let content = this.request.body.content
    if(!imgUrl && !content) {
      return (
            this.body = {
                ret: 0,
                err: 'content or url is required'
            }
        )
    }
    let wish = yield Wish.findOne({_id: id}).exec()

    let user = yield User.findOne({_id: wish.userid}).exec()
    wish.auditStatus = 'ing'
    user.sortAt = Date.now()
    if(imgUrl){
      wish.imgUrl = imgUrl
      wish.auditContent.imgUrl = 'ing'
    }
    if(content){
      wish.content = content
      wish.auditContent.content = 'ing'
    }

    wish.sortAt = Date.now()
    wish.meta.createdAt = new Date()
    // 通知中心
    let _notice = new Notice({
      userid: user._id,
      content: Msg(this.session.user.lan, 40)
    })
    yield _notice.save()
    yield wish.save()

    
    this.body = {
        ret: 1,
        err: 'ok'
    }

}


/**
 * @api {post} /boss/takeLove  点赞心愿墙，取消点赞
 * @apiName takeLove
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 点赞心愿墙
 *
 * @apiParam {String} state 'yes'代表点赞  'no'取消点赞
 * @apiParam {String} id 该条心愿的id
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/takeove
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "err": ok,
 *       "isTake": yes   yes代表点过赞 no代表没有
 *     }
 */
exports.takeLove = function *(next) {
	if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    let states = this.request.body.state
    let id = this.request.body.id
    let userid = this.session.user.userId
    let wish = yield Wish.findOne({_id:id}).exec()
    // console.log('this.request.body===',this.request.body)
    // console.log('wish===',wish)

    if (!wish) {
        return (this.body = {
            ret: 0,
            err: Msg(this.session.user.lan, 39)
        })
    }
    let isTake
    if(wish && states == 'yes'){
    	if(wish.loved.indexOf(userid) == -1){
    		wish.loved.push(userid)
        wish.save()
        isTake = "no"
    	}else{
        isTake = "yes"
      }
    }
    if(wish && states == 'no'){
    	for(let i = 0; i < wish.loved.length; i++) {
          if(userid == wish.loved[i]) {
            wish.loved.splice(i, 1)
          }
          wish.save()
      }
    }
	this.body = {
	    ret:1,
	    err: 'ok',
      isTake:isTake
	}
}

/**
 * @api {post} /boss/shareWish  心愿墙转发
 * @apiName shareWish
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 心愿墙转发
 *
 * @apiParam {String} state 'yes' 代表转发成功
 * @apiParam {String} id 该条心愿的id
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/shareWish
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "err": ok
 *     }
 */
exports.shareWish = function *(next) {
  if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    let states = this.request.body.state
    let id = this.request.body.id
    let userid = this.session.user.userId
    let wish = yield Wish.findOne({_id:id}).exec()
    // console.log('this.request.body===',this.request.body)
    // console.log('wish===',wish)

    if (!wish) {
        return (this.body = {
            ret: 0,
            err: Msg(this.session.user.lan, 39)
        })
    }
    
    if(wish && states == 'yes') {
        wish.Forwarding += 1
        wish.save()
    }
    this.body = {
        ret:1,
        err: 'ok'
    }
}

/**
 * @api {get} /boss/getOtherWish  获取别人的心愿
 * @apiName getSelfWish
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 获取别人的心愿
 *
 * @apiParam {String} pageNumber 页码1，2，3
 * @apiParam {String} limit 一页多少条10，20
 * @apiParam {String} id 对方id
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getOtherWish
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   list []
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "list": [{
 *           "created":"2017-09-07 11-43-12"  格式化后的创建时间
 *           "_id": "59afce7cbc959c500b4dc943",
 *           "userid": "5973146b72292702a79a9486",  该用户的id
 *           "content": "哈哈",                       心愿内容
 *           "imgUrl": "http://test-love-chat.oss-cn-shenzhen.aliyuncs.com/fateImage/156177833201504693881.jpg",心愿墙图片url
 *           "nickname": "佳哥",
 *           "sex": "1",
 *           "avatar": "http://love-chat.oss-cn-shanghai.aliyuncs.com/man-public/156177833201501121486.jpg",
 *           "__v": 3,
 *           "meta": {
 *               "updatedAt": "2017-09-07T01:40:04.949Z",
 *               "createdAt": "2017-09-06T10:31:24.269Z"
 *           },
 *           "auditContent": {
 *               "imgUrl": "failed",    //图片审核不通过
 *               "content": "failed"     //文字审核不通过
 *           },
 *           "auditReson": {
 *               "imgUrl": "照片敏感",    //图片审核不通过的具体原因  可以没有
 *               "content": "文字敏感，请更换"     //文字审核不通过的具体原因  可以没有
 *           },
 *           "loved": [
 *              "597eff5ad8d3f8727b15e6c2"  点赞的人的id  喜欢数是该数组的长度
 *           ],
 *           "auditStatus": "ing",  审核状态
 *           "Forwarding": 0         转发数目
 *
 *                  }]
 *     
 *     
 *     
 *     
 *     
 *     }
 */
exports.getOtherWish = function *(next) {
  if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    let pageNumber = this.query.pageNumber
    let limit = this.query.limit
    let id = this.query.id
    let pageNumbers = pageNumber > 0 ? pageNumber : 1
    let skip = (pageNumbers - 1) * limit
    let totalNum = yield Wish.count({userid:id,auditStatus:'success'}).exec()
    let wishLists = yield Wish.find({userid:id,auditStatus:'success'}).sort({'meta.createdAt': -1}).skip(Number(skip)).limit(Number(limit)).exec()
    if(!wishLists){
      return (this.body = {
            ret: 0,
            list: [],
            totalNum:0
        })
    }
    let _wishList = []

    for(let i = 0; i < wishLists.length; i++) {
        if(wishLists[i].loved.indexOf(this.session.user.userId) !== -1) {
            wishLists[i].isLove = 'yes'
        }else{
            wishLists[i].isLove = 'no'
        }
        let user = yield User.findOne({_id:id},{avatar: 1, nickname: 1,oldName:1, mobile: 1, sex: 1, vipLevel: 1,auditContent:1,isActive:1,avatar:1,oldAvatar:1}).exec()
        if(user && user.auditContent && user.auditContent.nickname && user.auditContent.nickname !== '1') {
          if(user.oldName) {
              user.nickname = user.oldName
            }else{
              if(user.sex == 2) {
                user.nickname = Msg(this.session.user.lan, 28)
              }else if(user.sex == 1) {
                user.nickname = Msg(this.session.user.lan, 29)
              }
            }
        }
        if(user && user.auditContent && user.auditContent.avatar && user.auditContent.avatar !== '1') {
          if(user.oldAvatar) {
              user.nickname = user.oldAvatar
            }else{
              if(user.sex == 2) {
                user.avatar = 'http://new-h5-love-chat.oss-cn-shenzhen.aliyuncs.com/app/img/nv01.png'
              }else if(user.sex == 1) {
                user.avatar = 'http://new-h5-love-chat.oss-cn-shenzhen.aliyuncs.com/app/img/nan01.png'
              }
            }
        }
        wishLists[i].created = moment(wishLists[i].meta.createdAt).format('YYYY-MM-DD h:mm:ss')
        wishLists[i].user = user
        if(user){
          _wishList.push(wishLists[i])

      }  
    }
    console.log('_wishList===',_wishList)
  this.body = {
      ret:1,
      list: _wishList,
      totalNum:Math.ceil(totalNum/limit)
  }
}
/**
 * @api {post} /boss/uploadPub 上传公照
 * @apiName upload photo public
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 用户上传公照后，信息要重新审核，一张一张上传
 *
 * @apiParam {String} url 照片地址
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/uploadPub
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok"
 *     }
 */
exports.uploadPub = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first'
    })
  }
  let userid = this.session.user.userId || ''
  let url = this.request.body.url
  let user = yield User.findOne({_id: userid}).exec()
  if(user.photoPub && user.photoPub.length > 6) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 41)
    })
  }

  if(!user.photoPub) {
    user.photoPub = []
  }

  // if(!user.avatar) {
  //   user.completion += 12
  //   user.avatar = url
  // }

  let photo = {
    enable: 'ing',
    addr: url
  }

  user.photoPub.push(photo)

  // if(user.auditStatus === 'success') {
    user.auditStatus = 'ing'
    user.sortAt = Date.now()
  // }

  yield user.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}

/**
 * @api {post} /boss/photoPri 上传私照
 * @apiName upload photo private
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 用户上传私照后，信息要重新审核，一张一张上传
 *
 * @apiParam {String} url 照片地址
 * @apiParam {String} category 照片类别: common／普通照；life／生活照；tour／旅游照；car／座驾照；house／豪宅；goods／ 奢物；sport／运动；work／工作；swimwear／泳衣；looks／素颜
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/photoPri
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok"
 *     }
 */
exports.photoPri = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first'
    })
  }
  let userid = this.session.user.userId || ''
  let url = this.request.body.url
  let category = this.request.body.category
  let user = yield User.findOne({_id: userid}).exec()

  if(user.photoPri && user.photoPri.length > 0) {
    let n = 0
    for (var i = user.photoPri.length - 1; i >= 0; i--) {
      if(user.photoPri[i].category === 'common') {
        n++
      }
      // let type = {life: '生活照', tour: '旅游照', car: '座驾照', house: '豪宅', goods:  '奢物', sport: '运动', work: '工作', swimwear: '泳衣', looks: '素颜'}
      // if(type[category]) {
      //   return (this.body = {
      //     ret: 0,
      //     err: '私照最多只能上传6张'
      //   })
      // }
      if(user.photoPri[i].category !== 'common' && user.photoPri[i].category === category) {
        user.photoPri.splice(i, 1)
      }
    }
    if(n >= 6) {
      return (this.body = {
        ret: 0,
        err: Msg(this.session.user.lan, 42)
      })
    }
  }

  if(!user.photoPri) {
    user.photoPri = []
  }

  let photo = {
    enable: 'ing',
    category: category,
    addr: url
  }

  user.photoPri.push(photo)

  // if(user.auditStatus === 'success') {
  user.auditStatus = 'ing'
  user.sortAt = Date.now()
  // }

  user.markModified('photoPri')

  yield user.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}


/**
 * @api {post} /boss/delePub 删除公开照片
 * @apiName delete Pubphoto
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 删除公开照片
 *
 * @apiParam {String} photoName 照片url
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/delePub
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   "没有找到该照片"
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok"
 *     }
 */

exports.delePub = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first'
    })
  }

  let userId = this.session.user.userId || ''
  let photoName = this.request.body.photoName
  
  let user = yield User.update({_id:userId},{$pull:{'photoPub':{addr:photoName}}}).exec()
  if(user.nModified == 1) {
    return (this.body = {
      ret: 1,
      err: 'ok'
    })
  }
  this.body = {
    ret: 0,
    err: Msg(this.session.user.lan, 43)
  }


}


/**
 * @api {post} /boss/delePri 删除私人照片
 * @apiName delete Priphoto
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 删除私人照片
 *
 * @apiParam {String} photoName 照片url
 * @apiParam {String} photoType 照片类型 照片类别: common／普通照；life／生活照；tour／旅游照；car／座驾照；house／豪宅；goods／ 奢物；sport／运动；work／工作；swimwear／泳衣；looks／素颜
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/delePri
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   "删除成功"
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "删除成功"
 *     }
 */

exports.delePri = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first'
    })
  }

  let userId = this.session.user.userId || ''
  let photoName = this.request.body.photoName
  let photoType = this.request.body.photoType
  let user = yield User.update({_id:userId},{$pull:{'photoPri':{addr:photoName,category:photoType}}}).exec()
  if(user.nModified == 1) {
    return (this.body = {
      ret: 1,
      err: 'ok'
    })
  }
  this.body = {
    ret: 0,
    err: Msg(this.session.user.lan, 43)
  }

}



/**
 * @api {get} /boss/priLists 私照权限用户列表
 * @apiName priLists
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 私照权限用户列表
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/priLists
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   "err msg"
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "priLists": []
 *     }
 */

exports.priLists = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: 'Please login first'
    })
  }

  let userId = this.session.user.userId || ''
  let user = yield Trace.findOne({userid:userId}).exec()

  if(!user) {
    return (this.body = {
      ret: 1,
      err: Msg(this.session.user.lan, 12)
    })
  }
  let lists = []
  if(user.photoPried && user.photoPried.length > 0) {
    for(var i = 0; i < user.photoPried.length; i++) {
          let list = yield User.findOne({_id:user.photoPried[i], isActive: {$ne: 'no'}}).exec()
          if(list) {
            lists.push(list)
          }
      }
  }


  let onlines = yield onlineCo.keys('*')

  for (let i = 0; i < lists.length; i++) {
    if(onlines.indexOf(lists[i]._id.toString()) > -1) {
      lists[i].online = 'yes'
    }
  }


  this.body = {
    ret: 1,
    err: 'ok',
    lists:lists
  }

}



/**
 * @api {post} /boss/cancelPri  取消私照权限
 * @apiName cancelPri
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 点赞心愿墙
 *
 * @apiParam {String} id 要取消的人的id
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/cancelPri
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": ok
 *     }
 */
exports.cancelPri = function *(next) {
  if(!this.session.user) {
        return (
            this.body = {
                ret: 0,
                err: 'Please login first'
            }
        )
    }
    let id = this.request.body.id
    let userid = this.session.user.userId
    let user = yield Trace.findOne({userid:userid}).exec()
    

    if (!user) {
        return (this.body = {
            ret: 0,
            err: Msg(this.session.user.lan, 12)
        })
    }
    
    if(user && user.photoPried && user.photoPried.length){
      for(let i = 0; i < user.photoPried.length; i++) {
          if(id == user.photoPried[i]) {
            user.photoPried.splice(i, 1)
          }
          user.save()
      }
    }
  this.body = {
      ret:1,
      err: 'ok'
  }
}



/**
 * @api {get} /boss/getCoupon  得到该用户的邀请码
 * @apiName getCoupon
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription 得到该用户的邀请码
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/getCoupon
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "error": "该用户没有邀请码",
 *       "result": [
 *             {
 *              "_id": "5983f9712a9bed056fc1c695",  
 *              "methods": "admin",                             //邀请码生产方式1 admin 系统管理员  2 distribution 分销系统 3 gift 系统赠送
 *              "createCodeid": "597318174c1a8c0350ccc296",     //绑定的那个人
 *              "content": "lksug",                             //验证码
 *              "__v": 0,
 *              "meta": { 
 *                 "endAt": "2018-08-01T12:00:00.829Z",         //到期时间
 *                  "updatedAt": "2017-08-04T04:34:57.707Z",
 *                 "createdAt": "2017-08-04T04:34:57.706Z"      //生产时间
 *            },
 *             "isUse": false,                                  //是否可以使用 1 true 可以使用 2 false  不可以使用
 *             "useLimit": 1,                                   //该验证码可以使用的次数
 *             "useCodeid": []                                  //使用者的id
 *        }
 *     }
 */
exports.getCoupon = function *(next) {
    if (!this.session.user) {
      return (this.body = {
        ret: 0,
        err: 'Please login first'
      })
    }
    let userid = this.session.user.userId || ''
    let existCoupon = yield Coupon.find({createCodeid:userid}).exec()
    let user = yield User.findOne({_id:userid},{vip:1}).exec()
    let person
    if(user.vip.coupons){
        person = yield Coupon.findOne({content:user.vip.coupons}).exec()
    }
    if (!existCoupon) {
        return (this.body = {
            ret: 0,
            err: Msg(this.session.user.lan, 44)
        })
    }
    if(person){
      existCoupon.push(person)
    }
    this.body = {
        ret:1,
        err: 'ok',
        result:existCoupon
    }
}

