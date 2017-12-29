'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
// const Trace = mongoose.model('Trace')
const Pay = mongoose.model('Pay')
const Coupon = mongoose.model('Coupon')
const Notice = mongoose.model('Notice')
const Iab_verifier = require('iab_verifier')
// const Incomeag = mongoose.model('Incomeag')
// const Agentuser = mongoose.model('Agentuser')
const crypto = require('crypto')
// const sms = require('../service/sms')
const common = require('../libs/common')
const alipay = require('../service/alipay')
// const amap = require('../service/amap')
// const Msg = require('../libs/msg')
const config = require('../../config/config')
const moment = require('moment')
const Msg = require('../libs/role').msg


/**
 * @api {post} /boss/creatGpay  生成谷歌pay 订单, 获取订单价格等信息
 * @apiName creatGpay
 * @apiGroup GooglePay
 * @apiPermission user
 *
 * @apiDescription  生成谷歌pay 订单,获取订单价格等信息
 *
 * @apiParam {String} meal  meal_a：表示套餐a（男：488:15天）；meal_b：表示套餐b（男：988:60天）；meal_c：表示套餐c:（男：1888:180天）
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/creatGpay
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   outTradeId 先保存，将来通过接口 /appleVerify 跟苹果服务充值服务器进行检验
 * @apiSuccess {String}   productID  产品ID：gold_member
 * @apiSuccess {String}   price 188套餐价格
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "outTradeId": "1499843250400",
 *       "productID": "gold_member",
 *			 "price": 188
 *     }
 */

exports.creatGpay = function *(next) {	

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录',
    })
  }

  console.log('boss body===', this.request.body.meal)

	let meal = this.request.body.meal || ''

	if (!meal) {
    return (this.body = {
      ret: 0,
      err: '还没有选择套餐',
    })
  }

  let user = yield User.findOne({_id: this.session.user.userId}).exec()

  let payConf = config.payBossMan
  if(user.sex == 2) {
  	payConf = config.payBossWoman
  }
	let num = payConf[meal].usd
	let time = payConf[meal].time

	if(user.couponType == 'agent') {
		num = payConf[meal].fxusd
	}

	let gpayProductIDObj = config.gpayProductIDBossMan
	if(user.sex == 2) {
  	gpayProductIDObj = config.gpayProductIDBossWuMen
  }
  if(user.couponType == 'agent') {
		gpayProductIDObj = config.gpayProductIDBossManGent
		if(user.sex == 2) {
	  	gpayProductIDObj = config.gpayProductIDBossWuMenGent
	  }
	}
	let appleProductID = gpayProductIDObj[meal]

	let outTradeId = Date.now().toString()

	let pay = new Pay({
		userid: user._id,
		nickname: user.nickname,
		sex: user.sex,
		from: 'boss',
		mobile: user.mobile,
		avatar: user.avatar,
		payType: 'gpay',
		value: num,
		agent: 'no',
		units: 'USD',
		time: time,
		outTradeId: outTradeId,
		meal: meal
	})


	if(user.couponType == 'agent') {
		pay.agent = 'yes'
	}

	yield pay.save()

	this.body = {
		ret: 1,
		outTradeId: outTradeId,
		productID: appleProductID,
		price: num
	}
}

/**
 * @api {post} /boss/gpayVerify  谷歌支付服务充值服务器进行检验
 * @apiName gpayVerify
 * @apiGroup GooglePay
 * @apiPermission user
 *
 * @apiDescription 服务器收到收据后谷对歌支付服务充值服务器进行检验
 *
 * @apiParam {String} outTradeId 在接口 /creatApple 返回的outTradeId;用它确定对应的订单
 * @apiParam {Number} RESPONSE_CODE 支付的结果， 0 (支付了)， 1 (取消)， 2 (退款)
 * @apiParam {Object} INAPP_PURCHASE_DATA 是一段 json 字符串，包含订单的信息
 * @apiParam {String} INAPP_DATA_SIGNATURE 签名
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/gpayVerify
 *
 * @apiSuccess {Number}   ret   1
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       	ret: 1,
 *       	vip: _user.vip,
 *				vipLevel: _user.vipLevel,
 *				vipText: vipText,
 *				endTime:endTime,
 *				isValid: isValid  // 验证回调结果
 *     }
 */
exports.gpayVerify = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录',
    })
  }
  let userid = this.session.user.userId
	let outTradeId = this.request.body.outTradeId || ''
	let RESPONSE_CODE = this.request.body.RESPONSE_CODE
	let INAPP_PURCHASE_DATA = this.request.body.INAPP_PURCHASE_DATA
	let INAPP_DATA_SIGNATURE = this.request.body.INAPP_DATA_SIGNATURE
	// let INAPP_DATA_SIGNATURE = 'bkUkG1hQe7aIer1NNjt9HPNTEFKMXodZ09umexBcR1JMtOwUVD8Q10OMbUr3dMYaXpsY9EI6+9i1XObKIvG3+oM4swniaN6hOUQjKSqrl+y+wtpb1+pZyNPBk8CeiiMIe1/wBNuOx0+4GZU33NQAVJqFfrSfQ6/Z+/TUgFXYPfY9HhfuzNGvSlJo3+AqBkqLyAY3m+EfOwd+EYT0TF09hl/gBKUqp457Wy5SGPu2BErTEuNKHeAhLCLrSj5usN1XLkKHjSOsLk13Z0uYq6T+PTByuCTu7PYqBJ2ir1x76aB/33SjnCOOzm3Ag0c0JOKHSTUQbA5XaIw0obRg/3QGXA=='
	// let INAPP_PURCHASE_DATA = {"orderId":"GPA.3378-3922-4060-48645","packageName":"com.app.legle.lovesudy","productId":"meal_b_m_d","purchaseTime":1506594581590,"purchaseState":0,"developerPayload":"1506594561576","purchaseToken":"iggcgbnjcmbcnnocgeegeiml.AO-J1Oyed3eT1N08GUhM5-GiuRmXHWOgvhnQ6v3WvCIFDpxO1qeQT1XVr7s9ymeoIUXoKgYTGUPUsEc8ByOHR7uRPjG1uA_4SJDg-v8QXqaMqlFHyF4ixtF9SbtHRG1llsx6sdGzCg0W"}
	INAPP_PURCHASE_DATA = JSON.stringify(INAPP_PURCHASE_DATA)

	console.log('gpayVerify  body====', this.request.body)

	let pay = yield Pay.findOne({outTradeId: outTradeId}).exec()
	if(!pay) {
		return (this.body = {
      ret: 0,
      err: '订单不存在',
    })
	}

	let user = yield User.findOne({_id: userid}).exec()

	var googleplayVerifier = new Iab_verifier(config.gpaykey)

	var isValid = googleplayVerifier.verifyReceipt(INAPP_PURCHASE_DATA,INAPP_DATA_SIGNATURE)
	console.log('gpayVerify  isValid====', isValid)

	if(isValid && pay.status === 'ing' && RESPONSE_CODE == 0) {
		pay.status = 'success'
		let user = yield User.findOne({_id: pay.userid}).exec()
		if(!user.vip.role) {
			user.vip.role = true
			user.vip.from = new Date()
			user.vip.to = new Date().getTime() + pay.time
		} else {
			user.vip.to = new Date(user.vip.to).getTime() + pay.time
		}

		let noticeText = {
      meal_a: 7,
      meal_b: 14,
      meal_c: 28,
      meal_d: 90
    }
		if(user.sex == 2) {
			noticeText.meal_a = 7
			noticeText.meal_b = 14
			noticeText.meal_c = 28
			noticeText.meal_d = 90
		}

    let notice = Msg(this.session.user.lan, 90) + noticeText[pay.meal] + Msg(this.session.user.lan, 91) + noticeText[pay.meal] + Msg(this.session.user.lan, 92)
    // 通知中心
    let _notice = new Notice({
      userid: user._id,
      content: notice
    })
    yield _notice.save()

		user.vip.category = 'gpay'
		function createInviteCode() {
	        let s = []
	        let chars = 'qwertyuiopasdfghjklzxcvbnm'
	        for (let i = 0; i < 4; i++) {
	            s[i] = chars.substr(Math.floor(Math.random() * 26), 1)
	        }
	       let code = s.join('')
	       let num = '0123456789'
	       let number = num.substr(Math.floor(Math.random() * 10), 1)
	       return code+number
		}
		if(pay.meal == 'meal_c') {
			//随机函数
			let newCode = new Coupon({
			createCodeid:this.session.user.userId,
	        //系统赠送
	        methods: 'gift',
	        content: createInviteCode(),
	        meta: {
	          //有效期一年
	          endAt: new Date().getTime() + 3600 * 24 * 1000 * 30
	        }
	      })

				// 通知中心
	      let cNotice = Msg(this.session.user.lan, 93) + newCode.content + Msg(this.session.user.lan, 94)
		    let _notice = new Notice({
		      userid: user._id,
		      content: cNotice
		    })
		    yield _notice.save()

      	yield newCode.save()
		}
		if(pay.meal == 'meal_d') {
			for (var i = 0; i < 3; i++) {
				let newCode = new Coupon({
					createCodeid:this.session.user.userId,
	        //系统赠送
	        methods: 'gift',
	        content: createInviteCode(),
	        meta: {
	          //有效期一年
	          endAt: new Date().getTime() + 3600 * 24 * 1000 * 30
	        }
	      })

				// 通知中心
	      let cNotice = Msg(this.session.user.lan, 93) + newCode.content + Msg(this.session.user.lan, 94)
		    let _notice = new Notice({
		      userid: user._id,
		      content: cNotice
		    })
		    yield _notice.save()

	      yield newCode.save()
			}
		}

		// vip 积累等级
		let payConf = config.payBossMan
	  if(pay.sex == 2) {
	  	payConf = config.payBossWoman
	  }

	  let newValue = payConf[pay.meal].value

		user.rmbTotal += newValue
		let vipLevel = config.vipLevelBossMan

		if(user.sex == 2) {
			vipLevel = config.vipLevelBossWoman
		}

		for (let i = 0; i < vipLevel.length; i++) {
			vipLevel[i]
			if(user.rmbTotal >= vipLevel[i]) {
				user.vipLevel = 'vip' + i
			}
		}

		yield user.save()
		yield pay.save()

		if(user.couponType == 'agent') {
			// 记录流水帐户
			let orderData = {
				orderid: pay._id,
				value: newValue,
				userid: user._id
			}

			let agentPay
			try {
				agentPay = yield common.chargeOrder(orderData)
			}
			catch(catcherr) {
				console.log('用户充值同步失败====', catcherr, Date())
			}

			if(agentPay !== 0) {
				console.log('用户充值同步成功====', agentPay, Date())
			}
		}
	}
	else if(RESPONSE_CODE !== 0 && pay.status === 'ing') {
		pay.status = 'failed'
		yield pay.save()
		return (this.body = {
			ret: 0,
			err: '支付失败，请重新支付'
		})
	} else {
		// console.log('alipay this.request.body=====', this.request.body)
	}

	let endTime = '于' + moment(user.vip.to).format('YYYY-MM-DD') + '到期'

	let _user = yield User.findOne({_id: userid}).exec()

	let vipText = config.vipTextBossMan[_user.vipLevel]
	if(_user.sex == 2) {
		vipText = config.vipTextBossWoman[_user.vipLevel]
	}

	this.body = {
		ret: 1,
		endTime: endTime,
		vipText: vipText,
		user: _user,
		isValid: isValid
	}
}




/**
 * @api {post} /boss/creatApple  获取苹果内购订单价格
 * @apiName creatApple
 * @apiGroup Apple
 * @apiPermission user
 *
 * @apiDescription 前端生成订单时获取苹果内购订单价格
 *
 * @apiParam {String} meal  meal_a：表示套餐a（男：488:15天）；meal_b：表示套餐b（男：988:60天）；meal_c：表示套餐c:（男：1888:180天）
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/creatApple
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   outTradeId 先保存，将来通过接口 /appleVerify 跟苹果服务充值服务器进行检验
 * @apiSuccess {String}   productID  产品ID：gold_member
 * @apiSuccess {String}   price 188套餐价格
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "outTradeId": "1499843250400",
 *       "productID": "gold_member",
 *			 "price": 188
 *     }
 */

exports.creatApple = function *(next) {	

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录',
    })
  }

  console.log('boss body===', this.request.body.meal)

	let meal = this.request.body.meal || ''

	if (!meal) {
    return (this.body = {
      ret: 0,
      err: '还没有选择套餐',
    })
  }

  let user = yield User.findOne({_id: this.session.user.userId}).exec()

  let payConf = config.payBossMan
  if(user.sex == 2) {
  	payConf = config.payBossWoman
  }
	let num = payConf[meal].value
	let time = payConf[meal].time


	let appleProductIDObj = config.appleProductIDBossMan
	if(user.sex == 2) {
  	appleProductIDObj = config.appleProductIDBossWuMen
  }
	if(user.couponType == 'agent') {
		num = payConf[meal].fxvalue
		appleProductIDObj = config.appleProductIDBossManGent
		if(user.sex == 2) {
	  	appleProductIDObj = config.appleProductIDBossWuMenGent
	  }
	}
	let appleProductID = appleProductIDObj[meal]

	let outTradeId = Date.now().toString()

	let pay = new Pay({
		userid: user._id,
		nickname: user.nickname,
		sex: user.sex,
		from: 'boss',
		mobile: user.mobile,
		avatar: user.avatar,
		payType: 'applepay',
		value: num,
		agent: 'no',
		units: 'rmb',
		time: time,
		outTradeId: outTradeId,
		meal: meal
	})

	if(user.couponType == 'agent') {
		pay.agent = 'yes'
	}

	yield pay.save()

	this.body = {
		ret: 1,
		outTradeId: outTradeId,
		productID: appleProductID,
		price: num
	}
}


/**
 * @api {post} /boss/appleVerify  苹果服务充值服务器进行检验
 * @apiName appleVerify
 * @apiGroup Alipay
 * @apiPermission user
 *
 * @apiDescription 服务器收到收据后发送到app stroe验证收据的有效性
 *
 * @apiParam {String} outTradeId 在接口 /creatApple 返回的outTradeId;用它确定对应的订单
 * @apiParam {String} receiptData IOS充值回调的transaction.transactionReceipt base64Encoding
 * @apiParam {String} inReview 是否处于审核阶段
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/appleVerify
 *
 * @apiSuccess {Number}   ret   1
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       	ret: 1,
 *       	vip: _user.vip,
 *				vipLevel: _user.vipLevel,
 *				vipText: vipText,
 *				endTime:endTime,
 *				payData: payData  // 验证回调结果
 *     }
 */
exports.appleVerify = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录',
    })
  }
	let outTradeId = this.request.body.outTradeId || ''
	let receiptData = this.request.body.receiptData
	let inReview = this.request.body.inReview
	let userid = this.session.user.userId

	let pay = yield Pay.findOne({outTradeId: outTradeId}).exec()
	if(!pay) {
		return (this.body = {
      ret: 0,
      err: '订单不存在',
    })
	}

	let user = yield User.findOne({_id: userid}).exec()

	let payData

	try {
		payData = yield applepay.verifyReceipt(receiptData, inReview)
	}
	catch(catchErr) {
		return (this.body = {
			ret: 0,
			msg: '服务器错误 支付失败 请联系客服'
		})
	}

	if(!payData) {
		return (this.body = {
			ret: 0,
			msg: '服务器错误 支付失败 请联系客服'
		})
	}

	if(!pay) {
		return (this.body = {
			ret: 0,
			msg: '该 outTradeId 的订单不存在'
		})
	}

	try {
		payData = JSON.parse(payData)
	}
	catch (catchErr) {
		payData = payData
	}

	pay.receipt = payData.receipt

	if(payData.status == 0 && pay.status === 'ing') {
		pay.status = 'success'
		let user = yield User.findOne({_id: pay.userid}).exec()
		if(!user.vip.role) {
			user.vip.role = true
			user.vip.from = new Date()
			user.vip.to = new Date().getTime() + pay.time
		} else {
			user.vip.to = new Date(user.vip.to).getTime() + pay.time
		}

		let noticeText = {
      meal_a: 7,
      meal_b: 14,
      meal_c: 28,
      meal_d: 90
    }


    let notice = Msg(this.session.user.lan, 90) + noticeText[pay.meal] + Msg(this.session.user.lan, 91) + noticeText[pay.meal] + Msg(this.session.user.lan, 92)
    // 通知中心
    let _notice = new Notice({
      userid: user._id,
      content: notice
    })
    yield _notice.save()

		user.vip.category = 'applepay'
		function createInviteCode() {
	        let s = []
	        let chars = 'qwertyuiopasdfghjklzxcvbnm'
	        for (let i = 0; i < 4; i++) {
	            s[i] = chars.substr(Math.floor(Math.random() * 26), 1)
	        }
	       let code = s.join('')
	       let num = '0123456789'
	       let number = num.substr(Math.floor(Math.random() * 10), 1)
	       return code+number
		}
		if(pay.meal == 'meal_c') {
			//随机函数
			let newCode = new Coupon({
			createCodeid:this.session.user.userId,
	        //系统赠送
	        methods: 'gift',
	        content: createInviteCode(),
	        meta: {
	          //有效期一年
	          endAt: new Date().getTime() + 3600 * 24 * 1000 * 30
	        }
	      })

				// 通知中心
	      let cNotice = Msg(this.session.user.lan, 93) + newCode.content + Msg(this.session.user.lan, 94)
		    let _notice = new Notice({
		      userid: user._id,
		      content: cNotice
		    })
		    yield _notice.save()

      	yield newCode.save()
		}
		if(pay.meal == 'meal_d') {
			for (var i = 0; i < 3; i++) {
				let newCode = new Coupon({
					createCodeid:this.session.user.userId,
	        //系统赠送
	        methods: 'gift',
	        content: createInviteCode(),
	        meta: {
	          //有效期一年
	          endAt: new Date().getTime() + 3600 * 24 * 1000 * 30
	        }
	      })

				// 通知中心
	      let cNotice = Msg(this.session.user.lan, 93) + newCode.content + Msg(this.session.user.lan, 94)
		    let _notice = new Notice({
		      userid: user._id,
		      content: cNotice
		    })
		    yield _notice.save()

	      yield newCode.save()
			}
		}


				// vip 积累等级
		let payConf = config.payBossMan
	  if(pay.sex == 2) {
	  	payConf = config.payBossWoman
	  }

	  let newValue = payConf[pay.meal].value

		user.rmbTotal += newValue
		let vipLevel = config.vipLevelBossMan

		if(user.sex == 2) {
			vipLevel = config.vipLevelBossWoman
		}

		for (let i = 0; i < vipLevel.length; i++) {
			vipLevel[i]
			if(user.rmbTotal >= vipLevel[i]) {
				user.vipLevel = 'vip' + i
			}
		}

		yield user.save()
		yield pay.save()

		if(user.couponType == 'agent') {
			// 记录流水帐户
			let orderData = {
				orderid: pay._id,
				value: pay.value,
				userid: user._id
			}

			let agentPay
			try {
				agentPay = yield common.chargeOrder(orderData)
			}
			catch(catcherr) {
				console.log('用户充值同步失败====', catcherr, Date())
			}

			if(agentPay !== 0) {
				console.log('用户充值同步成功====', agentPay, Date())
			}

		}
	}
	else if(payData.status !== 0 && pay.status === 'ing') {
		pay.status = 'failed'
		yield pay.save()
		return (this.body = {
			ret: 0,
			msg: '支付失败，请重新支付'
		})
	} else {
		// console.log('alipay this.request.body=====', this.request.body)
	}

	let endTime = '于' + moment(user.vip.to).format('YYYY-MM-DD') + '到期'

	
	let vipText = config.vipTextBossMan[_user.vipLevel]
	if(_user.sex == 2) {
		vipText = config.vipTextBossWoman[_user.vipLevel]
	}

	this.body = {
		ret: 1,
		vip: _user.vip,
		vipLevel: _user.vipLevel,
		vipText: vipText,
		endTime:endTime,
		payData: payData
	}
}



/**
 * @api {post} /creatOrder  获取签名后的订单信息
 * @apiName creatOrder
 * @apiGroup Alipay
 * @apiPermission user
 *
 * @apiDescription 支付宝支付，获取签名后的订单信息
 *
 * @apiParam {String} meal  meal_a：表示套餐a（男：488:15天）；meal_b：表示套餐b（男：988:60天）；meal_c：表示套餐c:（男：1888:183天）
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/creatOrder
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   outTradeId 先保存，将来通过接口 /signVerify 获取最终支付结果的id
 * @apiSuccess {String}   params 签名后的订单信息。前端用来调用支付宝 	SDK 支付接口订单信息
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "outTradeId": "1499843250400",
 *			 "params": "app_id=2017071007700699&biz_content=xxxx.."
 *     }
 */

exports.creatOrder = function *(next) {	

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 1)
    })
  }

	let meal = this.request.body.meal || ''

	if (!meal) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 84)
    })
  }
	let user = yield User.findOne({_id: this.session.user.userId}).exec()

	let payConf = config.payBossMan
  if(user.sex == 2) {
  	payConf = config.payBossWoman
  }
	let num = payConf[meal].value
	let time = payConf[meal].time

	let msg = Msg(this.session.user.lan, 85)

	if(meal == 'meal_b') {
		msg = Msg(this.session.user.lan, 86)
		if(user.sex == 2) {
			msg = Msg(this.session.user.lan, 86)
		}
	}
	else if(meal == 'meal_c') {
		msg = Msg(this.session.user.lan, 87)
		if(user.sex == 2) {
			msg = Msg(this.session.user.lan, 87)
		}
	}
	else if(meal == 'meal_a') {
		msg = Msg(this.session.user.lan, 123)
		if(user.sex == 2) {
			msg = Msg(this.session.user.lan, 123)
		}
	}

	if(user.couponType == 'agent') {
		num = payConf[meal].fxvalue
	}


	let result = yield alipay.creatOrder(num, msg)


	let pay = new Pay({
		userid: user._id,
		from: 'boss',
		nickname: user.nickname,
		trade_no: result.trade_no,
		sex: user.sex,
		mobile: user.mobile,
		avatar: user.avatar,
		payType: 'alipay',
		value: num,
		agent: 'no',
		time: time,
		outTradeId: result.outTradeId,
		params: result.params,
		meal: meal
	})

	if(user.couponType == 'agent') {
		pay.agent = 'yes'
	}

	yield pay.save()

	this.body = {
		ret: 1,
		outTradeId: result.outTradeId,
		params: result.params
	}
}

/**
 * @api {post} /signVerify  验证是否支付成功
 * @apiName signVerify
 * @apiGroup Alipay
 * @apiPermission user
 *
 * @apiDescription 支付宝支付，返回最终的支付结果
 *
 * @apiParam {String} outTradeId 在接口 /creatOrder 返回的outTradeId;用它来验证是否支付成功
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/signVerify
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   ok 返回的支付结果
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "ok": 'xxx'
 *     }
 */
exports.signVerify = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 1)
    })
  }
	let outTradeId = this.request.body.outTradeId
	let userid = this.session.user.userId

	let user = yield User.findOne({_id: userid}).exec()
	let ok = yield alipay.payCheck(outTradeId)

	if(process.env.NODE_ENV === 'development') {
		let pay = yield Pay.findOne({outTradeId: outTradeId}).exec()
		if(!pay) {
			return (this.body = {
				ret: 0,
				msg: Msg(this.session.user.lan, 65)
			})
		}


		if(ok && pay.status === 'ing') {
			pay.status = 'success'
			let user = yield User.findOne({_id: pay.userid}).exec()
			if(!user.vip.role) {
				user.vip.role = true
				user.vip.from = new Date()
				user.vip.to = new Date().getTime() + pay.time
			} else {
				user.vip.to = new Date(user.vip.to).getTime() + pay.time
			}

			let noticeText = {
        meal_a: 7,
        meal_b: 14,
        meal_c: 28,
        meal_d: 90
      }


      let notice = Msg(this.session.user.lan, 90) + noticeText[pay.meal] + Msg(this.session.user.lan, 91) + noticeText[pay.meal] + Msg(this.session.user.lan, 92)
      // 通知中心
      let _notice = new Notice({
        userid: user._id,
        content: notice
      })
      yield _notice.save()

			user.vip.category = 'alipay'
			function createInviteCode() {
		        let s = []
		        let chars = 'qwertyuiopasdfghjklzxcvbnm'
		        for (let i = 0; i < 4; i++) {
		            s[i] = chars.substr(Math.floor(Math.random() * 26), 1)
		        }
		       let code = s.join('')
		       let num = '0123456789'
		       let number = num.substr(Math.floor(Math.random() * 10), 1)
		       return code+number
			}
			if(pay.meal == 'meal_c') {
				//随机函数
				let newCode = new Coupon({
				createCodeid:this.session.user.userId,
		        //系统赠送
		        methods: 'gift',
		        content: createInviteCode(),
		        meta: {
		          //有效期一年
		          endAt: new Date().getTime() + 3600 * 24 * 1000 * 30
		        }
		      })

					// 通知中心
		      let cNotice = Msg(this.session.user.lan, 93) + newCode.content + Msg(this.session.user.lan, 94)
			    let _notice = new Notice({
			      userid: user._id,
			      content: cNotice
			    })
			    yield _notice.save()

	      	yield newCode.save()
			}
			if(pay.meal == 'meal_d') {
				for (var i = 0; i < 3; i++) {
					let newCode = new Coupon({
						createCodeid:this.session.user.userId,
		        //系统赠送
		        methods: 'gift',
		        content: createInviteCode(),
		        meta: {
		          //有效期一年
		          endAt: new Date().getTime() + 3600 * 24 * 1000 * 30
		        }
		      })

					// 通知中心
		      let cNotice = Msg(this.session.user.lan, 93) + newCode.content + Msg(this.session.user.lan, 94)
			    let _notice = new Notice({
			      userid: user._id,
			      content: cNotice
			    })
			    yield _notice.save()

		      yield newCode.save()
				}
			}


			// vip 积累等级
			let payConf = config.payBossMan
		  if(pay.sex == 2) {
		  	payConf = config.payBossWoman
		  }

		  let newValue = payConf[pay.meal].value

			user.rmbTotal += newValue
			let vipLevel = config.vipLevelBossMan

			if(user.sex == 2) {
				vipLevel = config.vipLevelBossWoman
			}

			for (let i = 0; i < vipLevel.length; i++) {
				vipLevel[i]
				if(user.rmbTotal >= vipLevel[i]) {
					user.vipLevel = 'vip' + i
				}
			}

			yield user.save()
			yield pay.save()

			if(user.couponType == 'agent') {
				// 记录流水帐户
				let orderData = {
					orderid: pay._id,
					value: pay.value,
					userid: user._id
				}

				let agentPay
				try {
					agentPay = yield common.chargeOrder(orderData)
				}
				catch(catcherr) {
					console.log('用户充值同步失败====', catcherr, Date())
				}

				if(agentPay !== 0) {
					console.log('用户充值同步成功====', agentPay, Date())
				}
			}
		}
		else if(!ok && pay.status === 'ing') {
			pay.status = 'failed'
			yield pay.save()
		} else {
			console.log('alipay this.request.body=====', this.request.body)
		}
	}

	let endTime = Msg(this.session.user.lan, 95) + moment(user.vip.to).format('YYYY-MM-DD') + Msg(this.session.user.lan, 96)

	let _user = yield User.findOne({_id: userid}).exec()

	let vipText = config.vipTextBossMan[_user.vipLevel]
	if(_user.sex == 2) {
		vipText = config.vipTextBossWoman[_user.vipLevel]
	}

	this.body = {
		ret: 1,
		vip: _user.vip,
		vipLevel: _user.vipLevel,
		vipText: vipText,
		endTime:endTime,
		user: _user,
		ok: ok
	}
}
 

