'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Pay = mongoose.model('Pay')
const Coupon = mongoose.model('Coupon')
const Notice = mongoose.model('Notice')
const common = require('../libs/common')
const weixin = require('../service/weixin')
const config = require('../../config/config')
const moment = require('moment')



/**
 * @api {post} /weixin/creatOrder  获取微信支付prepay_id
 * @apiName weixin creatOrder
 * @apiGroup Weixin
 * @apiPermission user
 *
 * @apiDescription 微信支付，获取微信支付prepay_id
 *
 * @apiParam {String} meal  meal_a：表示套餐a（198:7天）；meal_b：表示套餐b（368:15天）；meal_c：表示套餐c:（638:28天）
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/weixin/creatOrder
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   outTradeId 先保存，将来通过接口 /signVerify 获取最终支付结果的id
 * @apiSuccess {String}   prepay_id 微信生成的预支付回话标识，用于后续接口调用中使用，该值有效期为2小时
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "outTradeId": "1499843250400",
 *			 "prepay_id": "wx201410272009395522657a690389285100"
 *     }
 */
exports.creatOrder = function *(next) {	
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录',
    })
  }
  let ip = this.request.header['x-real-ip']

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

	// let msg = '7天会员使用期'

	// if(num == 188) {
	// 	msg = '14天会员使用期'
	// } else if(num == 368) {
	// 	msg = '28天会员使用期'
	// } else if(num == 888) {
	// 	msg = '90天会员使用期'
	// }


	if(user.couponType == 'agent') {
		num = num * config.fenxiao.discount
	}

	let result = yield weixin.creatPay(ip, num)

	if(result && result.return_code == 'FAIL') {
		console.log('weixin pay error===', result.return_msg, Date())
		return (this.body = {
      ret: 0,
      err: '支付出错，联系客服',
    })
	}


	let pay = new Pay({
		userid: user._id,
		nickname: user.nickname,
		trade_no: result.out_trade_no,
		sex: user.sex,
		from: 'ca',
		mobile: user.mobile,
		avatar: user.avatar,
		payType: 'wxpay',
		value: num,
		time: time,
		outTradeId: result.outTradeId,
		params: result,
		meal: meal
	})

	yield pay.save()

	this.body = {
		ret: 1,
		outTradeId: result.outTradeId,
		result: result,
	}
}


/**
 * @api {post} /weixin/signVerify  验证是否支付成功
 * @apiName weixin signVerify
 * @apiGroup Weixin
 * @apiPermission user
 *
 * @apiDescription 支付宝支付，返回最终的支付结果
 *
 * @apiParam {String} outTradeId 在接口 /weixin/creatOrder 返回的outTradeId;用它来验证是否支付成功
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/weixin/signVerify
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
 *	     "vip": "_user.vip",
 *	     "vipLevel": "vip2",
 *	     "vipText": "黄金会员",
 *	     "endTime": "2017-09-18T03:08:15.977Z",
 *	     "ok": "SUCCESS"
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
	let ok = yield weixin.orderQuery(outTradeId)

	if(process.env.NODE_ENV === 'development') {
		let pay = yield Pay.findOne({outTradeId: outTradeId}).exec()
		if(!pay) {
			return (this.body = {
				ret: 0,
				msg: '该 outTradeId 的订单不存在'
			})
		}

		console.log('signVerify wxpay ok====', ok)

		if(ok.trade_state === 'SUCCESS' && pay.status === 'ing') {
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

			user.vip.category = 'wxpay'
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

				let agentPay = yield common.chargeOrder(orderData)

				if(agentPay !== 0) {
					console.log('用户充值成功同步====', agentPay, Date())
				}
			}
		}
		else if(ok.trade_state !== 'SUCCESS' && pay.status === 'ing') {
			pay.status = 'failed'
			yield pay.save()
		} else {
			console.log('wxpay this.request.body=====', this.request.body)
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
		ok: ok.trade_state
	}
}

exports.payCallback = function *(next) {

	let body = yield wxpay.parseString(this.request.body)

	let outTradeId = body.out_trade_no || ''
	let trade_status = body.result_code || ''
	let trade_no = body.transaction_id || ''
	let total_fee = body.total_fee || ''
	let sign = body.sign || ''

	let pay = yield Pay.findOne({outTradeId: outTradeId}).exec()
	if(!pay) {
		return (this.body = {
			ret: 0,
			msg: '该 outTradeId 的订单不存在'
		})
	}

	if(pay.params.sign !== sign || pay.params.total_fee !== total_fee) {
		var  postXMLData = '<xml>'
      postXMLData += '<return_code><![CDATA[FAIL]]></return_code>'
      postXMLData += '<return_msg><![CDATA[参数格式校验错误]]></return_msg>'
      postXMLData += '</xml>'

		return (this.body = postXMLData)
	}

	if(trade_status === 'SUCCESS' && pay.status === 'ing') {
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

    if(pay.from == 'boss') {
			noticeText = {
	      meal_a: 15,
	      meal_b: 60,
	      meal_c: 180
	    }
			if(user.sex == 2) {
				noticeText.meal_a = 30
				noticeText.meal_b = 90
			}
    }

	  let notice = '你购买了' + noticeText[pay.meal] + '天会员，享受' + noticeText[pay.meal] + '天聊天权限'
    // 通知中心
    let _notice = new Notice({
      userid: user._id,
      content: notice
    })
    yield _notice.save()

		user.vip.category = 'wxpay'
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
		if((pay.meal == 'meal_b' && pay.from == 'boss') || (pay.meal == 'meal_c' && pay.from !== 'boss')) {
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
		if((pay.meal == 'meal_c' && pay.from == 'boss') || (pay.meal == 'meal_d' && pay.from !== 'boss')) {
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
			let newValue = pay.value
			if(user.couponType == 'agent') {
				newValue = pay.value/config.fenxiao.discount - 8
				pay.discount = config.fenxiao.discount
			}
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
				console.log('用户充值失败同步====', catcherr, Date())
			}

			if(agentPay !== 0) {
				console.log('用户充值成功同步====', agentPay, Date())
			}
		}

	} else if(trade_status === 'TRADE_CLOSED' && pay.status === 'ing') {
		pay.status = 'failed'
		yield pay.save()
	} else {
		console.log('wxpay this.request.body=====', this.request.body)
	}

	this.body = {
		ret: 1,
		ok: 'ok'
	}
}


