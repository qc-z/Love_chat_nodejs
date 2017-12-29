'use strict'
const mongoose = require('mongoose')
const Apk = mongoose.model('Apk')

/**
 * @api {post} /apkInfo   查找应用包信息
 * @apiName apkInfo
 * @apiGroup Apk
 * @apiPermission User
 *
 * @apiDescription 获取应用包信息
 *
 * @apiParam {String} prrv   渠道号的别名
 * @apiParam {String} vest 马甲包名
 * @apiParam {String} versionName 版本号
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/apkInfo
 *
 * @apiSuccess {Object}   data 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *        ret: 1, // 1 成功 0 失败
 *        data: {
 *          id: 'sfd26yns', // 唯一id，表示每个发行版本的唯一id
 *          prrv: 'yyb',   // 渠道号的别名，每个渠道号取拼音或英文首字母，比如：app store=as 应用宝=yyb 小米=xm 360=360= 华为=hw ..等，如遇到重名，则写全拼，由后台添加
 *          vest: 'ca',     // 马甲包名
 *          versionName: '1.0.0', // 版本号
 *          versionCode: 1, // 版本更新次数
 *          pay: 11, // 编码表示男性或者女性的支付开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
 *          coupon: 11, // 编码表示男性或者女性的邀请码开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
 *          couponNeed: '邀请码选填', // 邀请码提示内容
 *          shiel: 'yes', // 是否显示伪会员数据开关, 由于会员列表完全是由后端控制，app不需要改, 
 *          vipHide: 'yes', // 是否隐藏侧边栏高级会员, 
 *          download: 'http://o7rq0bgkb.bkt.clouddn.com/apk/%E5%AE%A0%E7%88%B1v1.0.0_debug01.apk', // 下载地址, 
 *          updateHard: 'yes' //是否强制更新
 *        }
 *     }
 */
exports.apkInfo = function *(next) {
 let {prrv, vest, versionName} = this.request.body


 let apk = yield Apk.findOne({prrv: prrv, vest: vest, versionName: versionName}).exec()

 if(!apk) {
   return (this.body = {
    ret: 0,
    msg: '该应用包不存在'
   })
 }

  this.body = {
    ret: 1,
    data: apk
  }
}

/**
 * @api {post} /latestVersion   获取最新版本
 * @apiName latestVerson
 * @apiGroup Apk
 * @apiPermission User
 *
 * @apiDescription 获取对应 渠道和马甲 的最新版本
 *
 * @apiParam {String} prrv   渠道号的别名
 * @apiParam {String} vest 马甲包名
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/latestVersion
 *
 * @apiSuccess {Object}   data 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *        ret: 1, // 1 成功 0 失败
 *        data: {
 *          id: 'sfd26yns', // 唯一id，表示每个发行版本的唯一id
 *          prrv: 'yyb',   // 渠道号的别名，每个渠道号取拼音或英文首字母，比如：app store=as 应用宝=yyb 小米=xm 360=360= 华为=hw ..等，如遇到重名，则写全拼，由后台添加
 *          vest: 'ca',     // 英文字符串，表示马甲包名
 *          versionName: '1.0.0', // 版本号
 *          versionCode: 1, // 版本更新次数
 *          pay: 11, // 编码表示男性或者女性的支付开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
 *          coupon: 11, // 编码表示男性或者女性的邀请码开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
 *          couponNeed: '邀请码选填', // 邀请码提示内容
 *          shiel: 'yes', // 是否显示伪会员数据开关, 由于会员列表完全是由后端控制，app不需要改, 
 *          vipHide: 'yes', // 是否隐藏侧边栏高级会员,
 *          download: 'http://o7rq0bgkb.bkt.clouddn.com/apk/%E5%AE%A0%E7%88%B1v1.0.0_debug01.apk', // 下载地址, 
 *          updateHard: 'yes' //是否强制更新
 *        }
 *     }
 */
exports.latestVersion = function *(next) {

  let {prrv, vest} = this.request.body


  let apks = yield Apk.find({prrv: prrv, vest: vest}).exec()

  apks = apks.sort(function(item1, item2) {
    return item2.versionCode - item1.versionCode
  })

  let apk = apks[0]

  if(!apk) {
    return (this.body = {
      ret: 0,
      msg: '该应用包不存在'
    })
  }


  this.body = {
    ret: 1,
    data: apk
  }

}



/**
 * @api {get} /getApk   获取应用包信息
 * @apiName getApk
 * @apiGroup Apk
 * @apiPermission User
 *
 * @apiDescription 获取应用包信息
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/getApk
 *
 * @apiSuccess {Object}   data 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *				ret: 1, // 1 成功 0 失败
 *				data: {
 *					id: 'sfd26yns', // 唯一id，表示每个发行版本的唯一id
 *					prrv: 'yyb',   // 渠道号的别名，每个渠道号取拼音或英文首字母，比如：app store=as 应用宝=yyb 小米=xm 360=360= 华为=hw ..等，如遇到重名，则写全拼，由后台添加
 *					vest: 'ca',     // 英文字符串，表示渠道号的别名，每个渠道号取拼音或英文首字母，比如：app store=as 应用宝=yyb 小米=xm 360=360= 华为=hw ..等，如遇到重名，则写全拼，由后台添加
 *					versionName: '1.0.0', // 版本号
 *					versionCode: 1, // 版本更新次数
 *					pay: 11, // 编码表示男性或者女性的支付开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
 *					coupon: 11, // 编码表示男性或者女性的邀请码开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
 *          couponNeed: '邀请码选填', // 邀请码提示内容
 *					shiel: 'yes', // 是否显示伪会员数据开关, 由于会员列表完全是由后端控制，app不需要改, 
 *          vipHide: 'yes', // 是否隐藏侧边栏高级会员,
 *					download: 'http://o7rq0bgkb.bkt.clouddn.com/apk/%E5%AE%A0%E7%88%B1v1.0.0_debug01.apk', // 下载地址, 
 *					updateHard: 'yes' //是否强制更新
 *				}
 *     }
 */
exports.getApk = function *(next) {


	this.body = {
    ret: 1,
    data: {
      id: 'android7',
      prrv: 'bd',
      vest: 'ca',
      versionName: '1.0.2',
      versionCode: 3,
      pay: 11,
      coupon: 11,
      couponNeed: '请输入邀请码(选填)',
      shiel: 'no',
      download: 'http://androidyoubang.oss-cn-shanghai.aliyuncs.com/%E5%AE%A0%E7%88%B1%E8%9C%9C%E8%AF%ADv1.0.2_release_bd_8_19.apk',
      status: 'success',
      vipHide: 'no',
      updateHard: 'yes'
  }
}}

// exports.script = function *(next) {
// 	for (var i = 23; i >= 0; i--) {
//       let newApk = new Apk({
//         	id: parseInt(Math.random()*10000),
// 			prrv: 'yyb',
// 			vest: 'ca',
// 			versionName: '1.0.0',
// 			versionCode: 1,
// 			pay: 11,
// 			coupon: 11,
// 			shiel: 'yes',
// 			download: 'http://o7rq0bgkb.bkt.clouddn.com/apk/%E5%AE%A0%E7%88%B1v1.0.0_debug01.apk',
// 			updateHard: 'yes'
//       })
//       yield newApk.save()
//     }
// 	this.body = {
// 		ret: 1,
// 		msg:"ok"
// 	}
// }



exports.getApkList = function *(next) {
  let content = this.query.content || ''
  let number = this.query.pageNumber || 1

  let skip = (number - 1) * 10

  let query = {}
  let apks = []
  if(content) {
    query.id = content
    apks = yield Apk.find(query).exec()
  } else {
    apks = yield Apk.find(query).sort({'meta.createdAt': -1}).skip(skip).limit(10).exec()
  }
  let recordTotal = yield Apk.count(query).exec()
    
  this.body = {
    ret: 1,
    recordTotal: recordTotal,
    coupons: apks
  }
}

exports.editApk = function *(next) {
  // let id = this.request.body._id || ''
  // let prrv = this.request.body.prrv || ''
  // let vest = this.request.body.vest || ''
  // let versionName = this.request.body.versionName || ''
  // let versionCode = this.request.body.versionCode || ''
  // let pay = this.request.body.pay || ''
  // let coupon = this.request.body.coupon || ''
  // let shiel = this.request.body.shiel || ''
  // let download = this.request.body.download || ''
  // let updateHard = this.request.body.updateHard || ''
  let apkId = this.request.body._id || ''
  let action = this.request.body.action || ''
  let apk = yield Apk.findOne({_id: apkId}).exec()
  let bodyKeys = Object.keys(this.request.body)
  if(!apk) {
    return (this.body = {
      ret: 0,
      err: '该版本不存在'
    })
  }

  if(action === 'delete') {
    yield apk.remove()
    return (this.body = {
      ret: 2,
      msg: 'ok'
    })
  }

  for(let i = 0;i < bodyKeys.length;i++){
  	let key = this.request.body[bodyKeys[i]]
  	if(bodyKeys[i] !== '_id' && bodyKeys[i] !=='action'){
  		apk[bodyKeys[i]] = key
  	}
  }
  yield apk.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}




exports.addApk = function *(next) {
  let id = this.request.body.id || ''
  let bodyKeys = Object.keys(this.request.body)

  let apk = yield Apk.findOne({id: id}).exec()

  if(apk) {
    return (this.body = {
      ret: 0,
      msg: '该版本号已经存在'
    })
  }
  let apkArr = {}
  for(let i = 0;i < bodyKeys.length;i++){
  	let key = this.request.body[bodyKeys[i]]
  		apkArr[bodyKeys[i]] = key
  	}
  let newApk = new Apk(apkArr)

  yield newApk.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}

