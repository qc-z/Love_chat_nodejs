'use strict'

const Alipay = require('../libs/alipay');
 
const ali = new Alipay({
    appId: '2017071007700699',
    notifyUrl: 'http://lovechat.legle.cc/alipay/callback',
    rsaPrivate: process.cwd() + '/config/app_private_1024.txt',
    rsaPublic: process.cwd() + '/config/alipay_public_key_sha1.txt',
    sandbox: false,
    signType: 'RSA'
})

exports.creatOrder = function(num, msg) {
	return new Promise(function(resolve, reject) {
		num = Number(num)

		if(process.env.NODE_ENV === 'development') {
			num = 0.02
		}

		let outTradeId = Date.now().toString()
		 
		//生成支付参数供客户端使用 
		const params = ali.pay({
		    subject: msg,
		    body: msg,
		    outTradeId: outTradeId,
		    timeout: '10m',
		    amount: num,
		    goodsType: '0'
		})
		let data = {
			params: params,
			outTradeId: outTradeId
		}
		resolve(data)
	})
}
 
// exports.signVerify = function(outTradeId) {
// 	return new Promise(function(resolve, reject) {
// 		ali.query({
// 		    outTradeId: outTradeId
// 		}).then(function (ret) {
// 		    console.log("***** signVerify ret.body=", ret.body)
		    
// 		    //签名校验 
// 		    var ok = ali.signVerify(ret.body)
// 		    console.log("***** signVerify ok=", ok)
// 		    resolve(ok)
// 		}).catch(function(err) {
// 			reject(err)
// 		})
// 	})
// }

//查询交易状态 
exports.payCheck = function(outTradeId) {
	return new Promise(function(resolve, reject) {
		ali.query({
		    outTradeId: outTradeId
		}).then(function (ret) {
				let body = ret.body
				try {
					body = JSON.parse(body)
				} catch (err) {
					body = body
				}
		    console.log("***** signVerify ret.body=", ret.body)
		    console.log("***** signVerify ret.body=", body.alipay_trade_query_response)
		    let ok = false
		    if(body && body.alipay_trade_query_response && body.alipay_trade_query_response.trade_status === 'TRADE_SUCCESS') {
		    	ok = true
		    }
		    if(body && body.alipay_trade_query_response && body.alipay_trade_query_response.trade_status === 'TRADE_FINISHED') {
		    	ok = true
		    }
		    console.log("***** signVerify ok=", ok)
		    resolve(ok)
		}).catch(function(err) {
			reject(err)
		})
	})
}

function test() {
	//统一收单交易关闭接口 
	ali.close({
	    outTradeId: outTradeId
	}).then(function (ret) {
	    console.log("***** ret.body=" + body)
	})
	 
	//统一收单交易退款接口 
	ali.refund({
	    outTradeId: outTradeId,
	    operatorId: 'XX001',
	    refundAmount: '2.01',
	    refundReason: '退款'
	}).then(function (ret) {
	    console.log("***** ret.body=" + body)
	})
	 
	//查询对账单下载地址 
	ali.billDownloadUrlQuery({
	    billType: 'trade',
	    billDate: '2017-03'
	}).then(function (ret) {
	    console.log("***** ret.body=" + body)
	})
}
