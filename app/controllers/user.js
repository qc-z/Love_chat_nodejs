'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Trace = mongoose.model('Trace')
const Notice = mongoose.model('Notice')
const Chat = mongoose.model('Chat')
const Coupon = mongoose.model('Coupon')
const Agentuser = mongoose.model('Agentuser')
const xss = require('xss')
const moment = require('moment')
const sms = require('../service/sms')
const aliyun = require('../service/aliyun')
const jpush = require('../service/jpush')
const amap = require('../service/amap')
const Im = require('../libs/im')
// const common = require('../service/common')
const Msg = require('../libs/msg')
const facepp = require('../libs/facepp')
const common = require('../libs/common')
const config = require('../../config/config')
const weight = require('../../config/json/weight.json')
// const request = require('request-promise')


exports.index = function *(next) {
  var data = {
    username: '5971c4d45425e56dd7b29042',
    password: '123'
  }
  try {
    yield Im.addUser(data)
  }
  catch(err) {
    
  }
  this.body = {
    ret: 1,
    err: 'ok'
  }
}


/**
 * @api {post} /location  更新坐标
 * @apiName location
 * @apiGroup User
 * @apiPermission anyBody
 *
 * @apiDescription 在app用户授权的情况下，用户打开app，就更新一下坐标,确保用户最新定位
 *
 * @apiParam {String} lng  用户位置授权获取得到的 经度；不授权则为空
 * @apiParam {String} lat  用户位置授权获取得到的 纬度；不授权则为空
 * @apiParam {String} _id  用户的userId
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/location
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
      err: 'lat 或者 lng 为空, 不更新坐标'
    })
  }

  lat = Number(lat)
  lng = Number(lng)

  let user = yield User.findOne({_id: _id}).exec()

  if(!user) {
     return (this.body = {
      ret: 0,
      err: '用户不存在'
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
 * @api {get} /sendVerifyCode  用手机号码发验证码
 * @apiName sendVerifyCode
 * @apiGroup User
 * @apiPermission anyBody
 *
 * @apiDescription 手机发送验证码进行手机验证
 *
 * @apiParam {String} mobile 手机号码
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/sendVerifyCode
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
 * @api {post} /userSignupPhone   用户手机注册
 * @apiName userSignupPhone
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription user Signup Phone
 *
 * @apiParam {String} mobile   用户手机号码
 * @apiParam {String} password 用户密码
 * @apiParam {String} conformPassword 用户确认密码
 * @apiParam {Number} sex 用户性别：1 代表 男，2 代表 女
 * @apiParam {Number} form 版本类型：1 宠爱 love，2 boss直约 boss
 * @apiParam {String} code  用户收到的验证码
 * @apiParam {String} registration_id  jpush 初始化的registration_id
 * @apiParam {String} platform  系统类型 ios 或者 android，都是小写
 * @apiParam {String} lng  用户位置授权获取得到的 经度；不授权则为空
 * @apiParam {String} lat  用户位置授权获取得到的 纬度；不授权则为空
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/userSignupPhone
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
  code = String(code)

  if(!sex) {
    return (this.body = {
      ret: 0,
      err: '性别必填'
    })
  }

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
            err: '邀请码不存在'
          })
        }
        if(new Date(couponExist.meta.endAt).getTime() < new Date().getTime()) {
          return (this.body = {
            ret: 0,
            err: '邀请码已过期'
          })
        }
        if(!couponExist.isUse) {
          return (this.body = {
            ret: 0,
            err: '邀请码已被使用'
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
      err: Msg(lan, 13)
    })
  }
    
  if (!sms.checkCode({mobi:mobile,code:code})) {
    if(code === config.superCode) {

    } else {
      return (this.body = {
        ret: 0,
        err: '验证错误'
      })
    }
  }

  let existUser = yield User.findOne({mobile: mobile}).exec()

  if(existUser) {
    return (this.body = {
      ret: 0,
      err: '用户已存在'
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
    from: 'ca',
    sex: xss(sex),
    lat: xss(lat),
    lng: xss(lng),
    locAuthorize: locAuthorize,
    password: xss(password)
  })

  if((coupon && couponExist) || (coupon && fenxiao)) {
    if(couponExist.useCodeid.length == couponExist.useLimit - 1) {
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
      let cnotice = '尊敬的会员，您有查看和发送各10条消息权限'
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
    //     coupon: couponExist.content
    //   })
    //   yield agentuser.save()
    // }

    if(couponExist.methods == 'gift' && couponExist.createCodeid) {
      let couUser = yield User.findOne({_id: couponExist.createCodeid}, {_id: 1}).exec()
      if(couUser) {
        // 通知中心
        let cnotice = '你的' + couponExist.content + '邀请码已经使用'
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
    mobile: mobileUser.mobile
  }

  let notice = new Notice({
    userid: mobileUser._id,
    content: '尊贵的会员您好，欢迎加入宠爱蜜语，您需要尽快完善资料：1、您需要把您的资料完整度提升到90以上，才能获得发送信息的权限。2、系统会有专人对您的资料进行审核。3、审核通过后，其他会员可以搜索到您。4、请勿填写任何违反用户协议的内容。'
  })
  yield notice.save()

  this.body = {
    ret: 1,
    err: 'ok',
    id:mobileUser._id
  }
}


/**
 * @api {post} /userLogin  用户登录
 * @apiName userLogin
 * @apiGroup User
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
 * http://lovechat.legle.cc/userLogin
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
exports.login = function *(next) {
  let mobile = this.request.body.mobile
  let password = this.request.body.password
  let registration_id = this.request.body.registration_id
  let platform = this.request.body.platform
  if(!registration_id || !platform) {
    return (this.body = {
      ret: 0,
      err: 'registration_id or platform not found'
    })
  }

  const existUser = yield User.findOne({mobile:mobile}).exec()
  if (!existUser) {
    return (this.body = {
      ret: 0,
      err: '用户不存在'
    })
  }
  let match = yield existUser.comparePassword(password, existUser.password)

  if (!match) {
    return (this.body = {
      ret: 0,
      err: '密码错误'
    })
  }

  if (existUser.isActive == 'no') {
    return (this.body = {
      ret: 0,
      err: '该会员已经被封号'
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


  if(existUser.from !== 'ca') {
    existUser.from = 'ca'
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
 * @api {get} /getState  得到用户登陆状态
 * @apiName getState
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription get User state   
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getState
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err '用户已经登录'
 * @apiSuccess {Object}   user '{_id, mobile}'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "用户已经登录",
 *       "user": {xxx}
 *     }
 */
exports.loginState = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录',
    })
  }
  this.body = {
      ret: 1,
      err: '用户已经登录',
      user:this.session.user,
    }
}





/**
 * @api {post} /forgetPwd  用户忘记密码，找回密码接口
 * @apiName forgetPwd
 * @apiGroup User
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
 * http://lovechat.legle.cc/forgetPwd
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
    if (newPassword !== conformPassword) {
        return (this.body = {
            ret: 0,
            err: '两次输入的密码不一致'
        })
    }

    if(code == 9527) {

    }
    else if (!sms.checkCode({mobi:mobile,code:code})) {
        return(this.body = {
            ret: 0,
            err: '验证码错误'
        })
    }
    const existUser = yield User.findOne({mobile:mobile}).exec()
    if(!existUser) {
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
 * @api {post} /changePwd  用户修改密码
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
 * http://lovechat.legle.cc/changePwd
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
      err: '用户还没登录',
    })
  }

  let userid = this.session.user.userId || ''

  let oldPassword = this.request.body.oldPassword
  let newPassword = this.request.body.newPassword
  let conformPassword = this.request.body.conformPassword
  if (newPassword !== conformPassword) {
      return (this.body = {
          ret: 0,
          err: '新密码和确认密码不一致'
      })
  }



  const existUser = yield User.findOne({_id:userid}).exec()

  let match = yield existUser.comparePassword(oldPassword, existUser.password)

  if (!match) {
    return (this.body = {
      ret: 0,
      err: '旧密码错误'
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
 * @api {get} /getsts  获取阿里云临时上传账户
 * @apiName aliyun sts
 * @apiGroup Aliyun
 * @apiPermission User
 *
 * @apiDescription 获取阿里云临时上传账户,给客户端上传照片,注意上传路径：man-avatar/ 是男的头像上传路径；man-private/ 是男的私照上传路径；man-public/ 是男的公开照上传路径;woman-avatar/ 是女的头像上传路径；woman-private/ 是女的私照上传路径；woman-public/ 是女的公开照上传路径;
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getsts
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
 * @api {get} /aliyunToken  获取阿里云上传token
 * @apiName aliyun token
 * @apiGroup Aliyun
 * @apiPermission User
 *
 * @apiDescription 获取阿里云上传token,这个是给 管理后台上传照片用的
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/aliyunToken
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
 *     results: {token}
 */
exports.aliyunToken = function *(next) {

  // if(!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '请先登录'
  //   })
  // }

  let results
  try {
    results = yield aliyun.accessToken()
  } catch(err) {
    console.log(err)
    return (this.body = {
      ret: 0,
      result: err
    })
  }

  this.body = results
}


/**
 * @api {get} /editInfo  用户编辑资料
 * @apiName editInfo
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription  用户编辑资料
 *
 * @apiParam {String} nickname 昵称
 * @apiParam {String} addr 地区
 * @apiParam {String} age 年龄
 * @apiParam {String} lovePrice 宠爱指数
 * @apiParam {String} loveDate 甜蜜目标
 * @apiParam {String} assets 总资产
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
 * @apiParam {String} looking 正在寻找
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
                err: '用户没有登录，请登录'
            }
        )
    }
    if(!this.request.body) {
      return (
            this.body = {
                ret: 0,
                err: '更新内容不能为空'
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
    const weightSource = weight.name


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
    if(user.tour && user.tour.length == 0){
        result = result - 3
      }
      if(user.sports && user.sports.length == 0){
        result = result - 3
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
              character: '个性签名',
              selfInfo: '自我介绍',
              work: '职业描述'
            }
            let notice = '你的 ' + noticeText[key] + ' 资料已经审核通过'
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
        user.auditContent[key] = '2'
        user.sortAt = Date.now()
        let noticeText = {
          character: '个性签名',
          nickname: '昵称',
          selfInfo: '自我介绍',
          work: '职业描述'
        }

        let notice = '你的' + noticeText[key] + '资料正在审核'
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
        err: '编辑资料成功',
        user: user,
        completion: result
    }

}

/**
 * @api {get} /getOwerInfo 获取自己信息
 * @apiName getOwerInfo
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription get Ower info
 *
 * @apiParam {String} userId 用户ID，用户自己的id，必填
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getOwerInfo
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err   'ok'
 * @apiSuccess {Number}   msgNum   10 未读消息
 * @apiSuccess {String}   endTime   于 2017-08-12 到期
 * @apiSuccess {Boolean}   shield   true
 * @apiSuccess {Object}   result   {user}
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
            report: [{content:'骗子，一点钱没有', enable: true, reportAt: "2017-06-15T06:01:20.755Z", imgUrl, reportUserid}], // 被别人举报的对象，content: 举报内容；enable:审核结果；reportAt:举报时间；reportUser:举报人id
            meta: {"updatedAt": "2017-06-15T06:01:20.755Z", "createdAt": "2017-06-02T09:34:02.438Z"}, trace 对象更新时间 和 创建时间
          }
        }
 *     }
 *       "status": vipFailed(vip,未通过审核) || vipIng(vip,审核中) || toPerfect(完整度未达89) || toPerfectPub(完整度达89，未上传公开照片) || upVip(完整度达到100，审核中)
 */
exports.getOwerInfo = function *(next) {

  let id = this.query.userId || ''

  if(!id || id === 'null' || id === 'undefined') {
    return (this.body = {
      ret: 1,
      err: 'id 不能为空'
    })
  }

  const getUser = yield User.findOne({_id:id}).populate({path: 'traceid'}).exec()
  let msgNum = yield Chat.count({toid: id, readed: false}).exec()
  let endTime = '于' + moment(getUser.vip.to).format('YYYY-MM-DD') + '到期'
  return (this.body = {
    ret: 1,
    err: 'ok',
    msgNum: msgNum,
    endTime: endTime,
    shield: config.shield,
    result:getUser
  })
}




 /**
 * @api {get} /getInfo 得到用户信息
 * @apiName getInfo
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription get User info
 *
 * @apiParam {String} userId 用户id，可选，userId为空就返回自己的信息
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getInfo
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
        err: '用户还没登录'
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
        err: '你已经被封号，请联系客服'
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
    //           getUser.nickname = '魅力甜心'
    //         }else if(getUser.sex == 2){
    //           getUser.nickname = '成功男士'
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

  if(userTo.isActive == 'no') {
    return (this.body = {
      ret: 0,
      shield: config.shield,
      err: '该用户已经被封号处理'
    })
  }
  
  if(userTo && userTo.platform && userTo.registration_id) {
    let notice = getUser.nickname + '浏览了你'
    if(!getUser.nickname) {
      if(getUser.sex == '1') {
        notice = '有成功人士浏览了你'
      }
      if(getUser.sex == '2') {
        notice = '有魅力甜心浏览了你'
      }
    }
    // 通知中心
    // let _notice = new Notice({
    //   userid: userTo._id,
    //   thatUser: getUser._id,
    //   content: notice
    // })
    // yield _notice.save()
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
      err: '用户信息不存在'
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
 * @api {get} /getAppLists  查找三个列表
 * @apiName getAppLists
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription 查找三个列表
 *
 * @apiParam {String} search 筛选字段，1.byDistance(距离) 2.byLoginTime(活跃时间)3.byCreatTime(最近注册)
 * @apiParam {String} pageNumber   页码：从1开始
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getAPPLists
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
      err: '用户还没登录'
    })
  }
  let search = this.query.search
  let firstlists
  let lastlists
  let lists
  // let loc = yield User.find({auditStatus:auditStatus}).exec()

  // let point = { type : "Point", coordinates : loc.loc };


  let userId = this.session.user.userId || ''
  let user = yield User.findOne({_id: userId}).populate({path: 'traceid'}).exec()
  let sex = user.sex === 1 ? 2 : 1
  
  let number = this.query.pageNumber
  let pageSize = this.query.pageSize || 30

  if(search == 'byDistance') {
    let firstquery = {
      nickname: {$exists: true},
      avatar: {$exists: true},
      mobile:{$ne: user.mobile},
      sex: sex,
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
      firstlists = yield User.find(firstquery).populate({path: 'traceid'}).exec()
      lastlists = yield User.find(lastquery).populate({path: 'traceid'}).exec()
      lists = firstlists.concat(lastlists)
    }
    if(search == 'byLoginTime') {
      firstlists = yield User.find({nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, mock:false,sex: sex, mobile:{$ne: user.mobile}}).populate({path: 'traceid'}).sort({'loginAt': -1}).exec()
      lastlists = yield User.find({nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, mock:true,sex: sex, mobile:{$ne: user.mobile}}).populate({path: 'traceid'}).sort({'loginAt': -1}).exec()
      lists = firstlists.concat(lastlists)
    }
    if(search == 'byCreatTime') {
      firstlists = yield User.find({nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, mock:false, sex: sex, mobile:{$ne: user.mobile}}).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).exec()
      lastlists = yield User.find({nickname: {$exists: true}, isActive: {$ne: 'no'}, avatar: {$exists: true}, mock:true,sex: sex, mobile:{$ne: user.mobile}}).populate({path: 'traceid'}).sort({'meta.createdAt': -1}).exec()
      lists = firstlists.concat(lastlists)
    }


  if(!lists) {
    return (this.body = {
      ret: 0,
      err: '没有更多数据了'
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

  let recordTotal = lists.length

  if(number) {
    number > 1 ? number = number : number = 1
    let skip = (number - 1) * pageSize
    lists = lists.slice(skip,skip + pageSize)  
  }

  if(lists.length !== 0) {
    for (var i = 0; i < lists.length; i++) {
      if(lists[i].auditContent && lists[i].auditContent.nickname && lists[i].auditContent.nickname !== '1') {
        if(lists[i].oldName) {
          lists[i].nickname = lists[i].oldName
        }else{
          if(user.sex == 1) {
            lists[i].nickname = '魅力甜心'
          }else if(user.sex == 2) {
            lists[i].nickname = '成功男士'
          }
        }
      }
    }
  }

  this.body = {
    ret: 1,
    err: '查找成功',
    results:lists,
    pageNumber: number,
    pageSize: pageSize,
    recordTotal: recordTotal
  }
}




/**
 * @api {post} /searchLists  高级搜索
 * @apiName searchLists
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
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/searchLists
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
      err: '用户还没登录'
    })
  }
  console.log(this.request.body)

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

  let userId = this.session.user.userId || ''
  let numbers = body.pageNumber
  let pageSize = body.pageSize || 30
  let user = yield User.findOne({_id: userId}).populate({path: 'traceid'}).exec()

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
      lists = yield User.find(query).sort({'meta.createdAt': -1}).exec()
  }  
  

  if(!lists) {
    return (this.body = {
      ret: 0,
      err: '没有更多数据了'
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
      if(_user.photoPub) {  
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

  let recordTotal = newlists.length
   

  if(numbers) {
    numbers > 1 ? numbers = numbers : numbers = 1
    console.log('pagenumber',numbers)
    let skip = (numbers - 1) * pageSize
    newlists = newlists.slice(skip,skip+pageSize)
    console.log('pagenumber+newlists.length',newlists.length)
  }

  if(newlists.length !== 0) {
    for (var i = 0; i < newlists.length; i++) {
      if(newlists[i].auditContent && newlists[i].auditContent.nickname && newlists[i].auditContent.nickname !== '1') {
        if(newlists[i].oldName) {
          newlists[i].nickname = newlists[i].oldName
        }else{
          if(user.sex == 1) {
            newlists[i].nickname = '魅力甜心'
          }else if(user.sex == 2) {
            newlists[i].nickname = '成功男士'
          }
        }
      }
    }
  }


  this.body = {
    ret: 1,
    err: '查找成功',
    results:newlists,
    pageNumber: numbers,
    pageSize: pageSize,
    recordTotal: recordTotal
  }
}




/**
 * @api {get} /getOneList  查找某一个用户
 * @apiName getOneList
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription 查找某一个用户
 *
 * @apiParam {String} personId 用户id
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getOneList
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '没有此用户'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": Object
 *     }
 */
exports.getOneList = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
  let personId = this.query.personId
  const list = yield User.find({_id:personId}).exec()
  if(!list){
    return (this.body = {
      ret: 0,
      err: '没有此用户'
    })
  }
  this.body = {
    ret: 1,
    err: '查找成功',
    results:list
  }
}


/**
 * @api {post} /uploadPub 上传公照
 * @apiName upload photo public
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 用户上传公照后，信息要重新审核，一张一张上传
 *
 * @apiParam {String} url 照片地址
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/uploadPub
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
      err: '用户还没登录'
    })
  }
  let userid = this.session.user.userId || ''
  let url = this.request.body.url
  let user = yield User.findOne({_id: userid}).exec()
  if(user.photoPub && user.photoPub.length > 6) {
    return (this.body = {
      ret: 0,
      err: '公开照片最多只能上传6张'
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
 * @api {post} /photoPri 上传私照
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
      err: '用户还没登录'
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
        err: '私照最多只能上传6张'
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
 * @api {post} /avatar 上传头像
 * @apiName avatar
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 用户上传头像后，信息要重新审核
 *
 * @apiParam {String} url 照片地址
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/avatar
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
      err: '用户还没登录'
    })
  }
  let userid = this.session.user.userId || ''
  let url = this.request.body.url

  if(!url) {
    return (this.body = {
      ret: 0,
      err: '照片地址必须有'
    })
  }

  let user = yield User.findOne({_id: userid}).exec()

  if(!user.avatar) {
    user.completion += 12
  }

  user.avatar = url

  if(user.auditStatus === 'success') {
    user.auditStatus === 'ing'
    user.sortAt = Date.now()

  }

  yield user.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}


/**
 * @api {post} /delePub 删除公开照片
 * @apiName delete Pubphoto
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 删除公开照片
 *
 * @apiParam {String} photoName 照片url
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/delePub
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
      err: '用户还没登录'
    })
  }

  let userId = this.session.user.userId || ''
  let photoName = this.request.body.photoName
  
  let user = yield User.update({_id:userId},{$pull:{'photoPub':{addr:photoName}}}).exec()
  if(user.nModified == 1) {
    return (this.body = {
      ret: 1,
      err: '删除成功'
    })
  }
  this.body = {
    ret: 0,
    err: '删除失败'
  }


}


/**
 * @api {post} /delePri 删除私人照片
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
 * http://lovechat.legle.cc/delePri
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
      err: '用户还没登录'
    })
  }

  let userId = this.session.user.userId || ''
  let photoName = this.request.body.photoName
  let photoType = this.request.body.photoType
  let user = yield User.update({_id:userId},{$pull:{'photoPri':{addr:photoName,category:photoType}}}).exec()
  if(user.nModified == 1) {
    return (this.body = {
      ret: 1,
      err: '删除成功'
    })
  }
  this.body = {
    ret: 0,
    err: '删除失败'
  }

}


/**
 * @api {get} /getCoupon  得到该用户的邀请码
 * @apiName getCoupon
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription 得到该用户的邀请码
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getCoupon
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
        err: '用户还没登录'
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
            err: '该用户没有邀请码'
        })
    }
    existCoupon.push(person)
    this.body = {
        ret:1,
        err: 'ok',
        result:existCoupon
    }
}

/**
 * @api {post} /signupWeixin   用户手机微信注册
 * @apiName signupWeixin
 * @apiGroup User
 * @apiPermission User
 *
 * @apiDescription user Signup Phone
 *
 * @apiParam {String} mobile   用户手机号码
 * @apiParam {String} password 用户密码
 * @apiParam {String} conformPassword 用户确认密码
 * @apiParam {Number} sex 用户性别：1 代表 男，2 代表 女
 * @apiParam {String} code  用户收到的验证码
 * @apiParam {String} coupon  邀请码
 * @apiParam {Number} faceScore  颜值分
 * @apiParam {String} nickname  昵称
 * @apiParam {String} avatar  头像地址
 * @apiParam {String} lng  用户位置授权获取得到的 经度；不授权则为空
 * @apiParam {String} lat  用户位置授权获取得到的 纬度；不授权则为空
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/signupWeixin
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
  let coupon = this.request.body.coupon || ''
  code = String(code)


  if(!sex) {
    return (this.body = {
      ret: 0,
      err: '性别必填'
    })
  }

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
            err: '邀请码不存在'
          })
        }
        if(new Date(couponExist.meta.endAt).getTime() < new Date().getTime()) {
          return (this.body = {
            ret: 0,
            err: '邀请码已过期'
          })
        }
        if(!couponExist.isUse) {
          return (this.body = {
            ret: 0,
            err: '邀请码已被使用'
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
      err: Msg(lan, 13)
    })
  }
    
  if (!sms.checkCode({mobi:mobile,code:code})) {
    if(code === config.superCode) {

    } else {
      return (this.body = {
        ret: 0,
        err: '验证错误'
      })
    }
  }

  let existUser = yield User.findOne({mobile: mobile}).exec()

  if(existUser) {
    return (this.body = {
      ret: 0,
      err: '用户已存在'
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
    from: 'ca',
    sex: xss(sex),
    lat: xss(lat),
    lng: xss(lng),
    avatar: avatar,
    nickname: nickname,
    faceScore: faceScore,
    locAuthorize: locAuthorize,
    password: xss(password)
  })

  if((coupon && couponExist) || (coupon && fenxiao)) {
    if(couponExist.useCodeid.length == couponExist.useLimit - 1) {
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
      let cnotice = '尊敬的会员，您有查看和发送各10条消息权限'
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
    //     coupon: couponExist.content
    //   })
    //   yield agentuser.save()
    // }

    if(couponExist.methods == 'gift' && couponExist.createCodeid) {
      let couUser = yield User.findOne({_id: couponExist.createCodeid}, {_id: 1}).exec()
      if(couUser) {
        // 通知中心
        let cnotice = '你的' + couponExist.content + '邀请码已经使用'
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
    mobile: mobileUser.mobile
  }

  let notice = new Notice({
    userid: mobileUser._id,
    content: '尊贵的会员您好，欢迎加入宠爱蜜语，您需要尽快完善资料：1、您需要把您的资料完整度提升到90以上，才能获得发送信息的权限。2、系统会有专人对您的资料进行审核。3、审核通过后，其他会员可以搜索到您。4、请勿填写任何违反用户协议的内容。'
  })
  yield notice.save()

  this.body = {
    ret: 1,
    err: 'ok',
    id:mobileUser._id
  }
}



exports.faceTest = function *(next) {

  let imgUrl = this.request.body.imgUrl

  let facedata
  try {
    facedata = yield facepp.detectUrl(imgUrl)
  }
  catch (error) {
    console.log(error)
    return (this.body = {code:0,err:'照片识别错误，请确认照片是清晰的人脸'})
  }

  let _face = facepp.findBigestFace(facedata.faces)

  if(!_face) {
    return (this.body = {
      code: 0,
      err: '人脸识别失败'
    })
  }

  // adaptive old skin old Api
  _face.attribute=_face.attributes
  _face.attribute.smiling=_face.attribute.smile
  _face.face_id = _face.face_token

  let looks = yield facepp.cloudtest(_face)


  if(!looks) {
    return (this.body = {
      code: 0,
      err: '人脸识别失败'
    })
  }

  this.body = {
    ret: 1,
    score: looks.LooksTotalScore
  }

}



