'use strict'

const request = require('request-promise')
const fenxiaocf = require('../../config/config').fenxiao
const common={}

// 校验邀请码是否存在
common.checkCode = function (coupon) {
	
	let form = {
		data: {
			code: coupon
		}
	}


	return new Promise(function(resolve, reject) {
			let hearder = {
				url: fenxiaocf.host+'/api/checkCode',
				body: form,
				json: true
			}
	    request.post(hearder)
	    .then(function (body) {
	    		console.log('body====', body)
	        if(body && body.app && body.app.result == 0) {
	        	resolve(true)
	        }
	        else {
	        	resolve(false)
	        }
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('分销系统校验邀请码是否存在 出错'))
	    })
	})
}

// 新用户注册成功同步
common.newUser = function (req) {
	
	let form = {
		data: {
			bindid: req.userid,
			areaid: '',
			mobile: req.mobile,
			ipaddress: req.ip,
			code: req.coupon
		}
	}

	return new Promise(function(resolve, reject) {
			let hearder = {
				url: fenxiaocf.host+'/api/newUser',
				body: form,
				json: true
			}
	    request.post(hearder)
	    .then(function (body) {
	    		console.log('body====', body) //0业务处理成功  1用户ID已存在 2验证码不存在 3信息不能为空
	        if(body && body.app && body.app.result == 0) {
	        	resolve(body.app.result)
	        }
	        else {
	        	resolve(4)
	        }
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('新用户注册成功同步 出错'))
	    })
	})
}

// 用户充值成功同步，注意是成功的订单才同步过来
common.chargeOrder = function (req) {
	
	let form = {
		data: {
			orderid: req.orderid,
			bill_money: req.value,
			bindid: req.userid
		}
	}

	return new Promise(function(resolve, reject) {
	   	let hearder = {
				url: fenxiaocf.host+'/api/chargeOrder',
				body: form,
				json: true
			}
	    request.post(hearder)
	    .then(function (body) {
	    		console.log('body====', body) //0业务处理成功  1订单id已存在 2该用户不存在 3账单金额范围有误，限制为0.01-5000元 4请求信息有误
	        if(body && body.app && body.app.result == 0) {
	        	resolve(body.app.result)
	        }
	        else {
	        	resolve(4)
	        }
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('用户充值成功同步 出错'))
	    })
	})
}


module.exports = common
