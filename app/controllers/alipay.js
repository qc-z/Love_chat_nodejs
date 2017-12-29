'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
// const Trace = mongoose.model('Trace')
const Pay = mongoose.model('Pay')
const Coupon = mongoose.model('Coupon')
const Notice = mongoose.model('Notice')
// const Incomerate = mongoose.model('Incomerate')
// const Incomeag = mongoose.model('Incomeag')
// const Agentuser = mongoose.model('Agentuser')
// const xss = require('xss')
// const sms = require('../service/sms')
const common = require('../libs/common')
const alipay = require('../service/alipay')
const applepay = require('../service/applepay')
// const amap = require('../service/amap')
// const Msg = require('../libs/msg')
const config = require('../../config/config')
const moment = require('moment')


/**
 * @api {post} /creatApple  获取苹果内购订单价格
 * @apiName creatApple
 * @apiGroup Apple
 * @apiPermission user
 *
 * @apiDescription 前端生成订单时获取苹果内购订单价格
 *
 * @apiParam {String} meal  meal_a：表示套餐a（98:7天）；meal_b：表示套餐b（188:14天）；meal_c：表示套餐c:（388:28天）;meal_d：表示套餐d:（898:90天)
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/creatApple
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

  console.log('body===', this.request.body.meal)

	let meal = this.request.body.meal || ''

	if (!meal) {
    return (this.body = {
      ret: 0,
      err: '还没有选择套餐',
    })
  }

  let user = yield User.findOne({_id: this.session.user.userId}).exec()

	let payConf = config.pay
	let num = payConf[meal].value
	let time = payConf[meal].time

	let appleProductIDObj = config.appleProductID
	let appleProductID = appleProductIDObj[meal]


	// let msg = '7天会员使用期'

	// if(num == 188) {
	// 	msg = '14天会员使用期'
	// } else if(num == 388) {
	// 	msg = '28天会员使用期'
	// } else if(num == 898) {
	// 	msg = '90天会员使用期'
	// }


	if(user.couponType == 'agent') {
		num = num * config.fenxiao.discount
	}

	let outTradeId = Date.now().toString()

	let pay = new Pay({
		userid: user._id,
		nickname: user.nickname,
		sex: user.sex,
		from: 'ca',
		mobile: user.mobile,
		avatar: user.avatar,
		payType: 'applepay',
		value: num,
		time: time,
		outTradeId: outTradeId,
		meal: meal
	})

	yield pay.save()

	this.body = {
		ret: 1,
		outTradeId: outTradeId,
		productID: appleProductID,
		price: num
	}
}


/**
 * @api {post} /appleVerify  苹果服务充值服务器进行检验
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
 * http://lovechat.legle.cc/appleVerify
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

    let notice = '你购买了' + noticeText[pay.meal] + '天会员，享受' + noticeText[pay.meal] + '天聊天权限'
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
	      let cNotice = '你获得了' + newCode.content + '邀请码一个'
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
	      let cNotice = '你获得了' + newCode.content + '邀请码一个'
		    let _notice = new Notice({
		      userid: user._id,
		      content: cNotice
		    })
		    yield _notice.save()

	      yield newCode.save()
			}
		}


		// vip 积累等级
		let newValue = pay.value

		if(user.couponType == 'agent') {
			newValue = pay.value/config.fenxiao.discount
			pay.discount = config.fenxiao.discount
		}

		user.rmbTotal += newValue

		let vipLevel = config.vipLevel
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
				bill_money: pay.value,
				bindid: user._id
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

	let _user = yield User.findOne({_id: userid}).exec()

	let vipText = config.vipText[_user.vipLevel]

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
 * @apiParam {String} meal  meal_a：表示套餐a（198:7天）；meal_b：表示套餐b（368:15天）；meal_c：表示套餐c:（638:28天）
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
      err: '用户还没登录',
    })
  }

  console.log('body===', this.request.body.meal)

	let meal = this.request.body.meal || ''

	if (!meal) {
    return (this.body = {
      ret: 0,
      err: '还没有选择套餐',
    })
  }

  let user = yield User.findOne({_id: this.session.user.userId}).exec()

	let payConf = config.pay
	let num = payConf[meal].value
	let time = payConf[meal].time

	let msg = '7天会员使用期'

	if(num == 188) {
		msg = '14天会员使用期'
	} else if(num == 368) {
		msg = '28天会员使用期'
	} else if(num == 888) {
		msg = '90天会员使用期'
	}


	if(user.couponType == 'agent') {
		num = num * config.fenxiao.discount
	}

	let result = yield alipay.creatOrder(num, msg)


	let pay = new Pay({
		userid: user._id,
		nickname: user.nickname,
		trade_no: result.trade_no,
		sex: user.sex,
		from: 'ca',
		mobile: user.mobile,
		avatar: user.avatar,
		payType: 'alipay',
		value: num,
		time: time,
		outTradeId: result.outTradeId,
		params: result.params,
		meal: meal
	})

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
      err: '用户还没登录',
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
				msg: '该 outTradeId 的订单不存在'
			})
		}

		console.log('signVerify alipay ok====', ok)

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

      let notice = '你购买了' + noticeText[pay.meal] + '天会员，享受' + noticeText[pay.meal] + '天聊天权限'
      // 通知中心
      let _notice = new Notice({
        userid: user._id,
        content: notice
      })
      yield _notice.save()

			user.vip.category = 'alipay'
			function createInviteCode() {
		        let s = []
		        let chars = "qwertyuiopasdfghjklzxcvbnm"
		        for (let i = 0; i < 4; i++) {
		            s[i] = chars.substr(Math.floor(Math.random() * 26), 1);
		        }
		       let code = s.join("")
		       let num = "0123456789"
		       let number = num.substr(Math.floor(Math.random() * 10), 1);
		       return code+number
			}
			if(pay.meal == 'meal_c'){
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
		      let cNotice = '你获得了' + newCode.content + '邀请码一个'
			    let _notice = new Notice({
			      userid: user._id,
			      content: cNotice
			    })
			    yield _notice.save()

	      	yield newCode.save()
			}
			if(pay.meal == 'meal_d'){
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
		      let cNotice = '你获得了' + newCode.content + '邀请码一个'
			    let _notice = new Notice({
			      userid: user._id,
			      content: cNotice
			    })
			    yield _notice.save()

		      yield newCode.save()
				}
			}


			// vip 积累等级
			let newValue = pay.value

			if(user.couponType == 'agent') {
				newValue = pay.value/config.fenxiao.discount
				pay.discount = config.fenxiao.discount
			}

			user.rmbTotal += newValue

			let vipLevel = config.vipLevel
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
					bill_money: pay.value,
					bindid: user._id
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

	let endTime = '于' + moment(user.vip.to).format('YYYY-MM-DD') + '到期'

	let _user = yield User.findOne({_id: userid}).exec()


	let vipText = config.vipText[_user.vipLevel]

	this.body = {
		ret: 1,
		vip: _user.vip,
		vipLevel: _user.vipLevel,
		vipText: vipText,
		endTime:endTime,
		ok: ok
	}
}

exports.payCallback = function *(next) {

	let outTradeId = this.request.body.out_trade_no || ''
	let trade_status = this.request.body.trade_status || ''
	let trade_no = this.request.body.trade_no || ''

	let pay = yield Pay.findOne({outTradeId: outTradeId}).exec()
	if(!pay) {
		return (this.body = {
			ret: 0,
			msg: '该 outTradeId 的订单不存在'
		})
	}

	if((trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') && pay.status === 'ing') {
		pay.trade_no = trade_no
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

	  let notice = '你购买了' + noticeText[pay.meal] + '天会员，享受' + noticeText[pay.meal] + '天聊天权限'
    // 通知中心
    let _notice = new Notice({
      userid: user._id,
      content: notice
    })
    yield _notice.save()

		user.vip.category = 'alipay'
		function createInviteCode() {
      let s = []
      let chars = "qwertyuiopasdfghjklzxcvbnm"
      for (let i = 0; i < 4; i++) {
          s[i] = chars.substr(Math.floor(Math.random() * 26), 1)
      }
	     let code = s.join("")
	     let num = "0123456789"
	     let number = num.substr(Math.floor(Math.random() * 10), 1)
	     return code+number
		}
		if(pay.meal == 'meal_c' && pay.from !== 'boss') {
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
      let cNotice = '你获得了' + newCode.content + '邀请码一个'
	    let _notice = new Notice({
	      userid: user._id,
	      content: cNotice
	    })
	    yield _notice.save()
    	yield newCode.save()
		}
		if(pay.meal == 'meal_d' && pay.from !== 'boss') {
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
	      let cNotice = '你获得了' + newCode.content + '邀请码一个'
		    let _notice = new Notice({
		      userid: user._id,
		      content: cNotice
		    })
		    yield _notice.save()
	      yield newCode.save()
			}
		}
		// vip 积累等级
		if(pay.from == 'boss') {
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
		}
		else {
			let newValue = pay.value
			if(user.couponType == 'agent') {
				newValue = pay.value/config.fenxiao.discount - 8
				pay.discount = config.fenxiao.discount
			}
			user.rmbTotal += newValue
			let vipLevel = config.vipLevel
			for (let i = 0; i < vipLevel.length; i++) {
				vipLevel[i]
				if(user.rmbTotal >= vipLevel[i]) {
					user.vipLevel = 'vip' + i
				}
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

	} else if(trade_status === 'TRADE_CLOSED' && pay.status === 'ing') {
		pay.status = 'failed'
		yield pay.save()
	} else {
		console.log('alipay this.request.body=====', this.request.body)
	}

	this.body = {
		ret: 1,
		ok: 'ok'
	}
}


