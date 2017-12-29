'use strict'

const request = require('request-promise')
const randomstring = require('randomstring')
const md5 = require('md5')
const fs = require('fs')
const parseString = require('xml2js').parseString
const querystring = require('querystring')
const wxConfig = require('../../config/config').weixin

exports.creatPay = function (ip, money) {
  return new Promise(function(resolve, reject) {
    var RANDOM_NUM = randomstring.generate({
      length: 16,
      charset: 'alphanumeric'
    })

    let outTradeId = Date.now().toString()

    var PFX = process.cwd() + '/config/weixin.p12'
    var url = 'https://api.mch.weixin.qq.com/pay/unifiedorder'

    // if(process.env.NODE_ENV === 'development') {
    //   money = 0.02
    // }

    var postData = {
        appid: wxConfig.appid, // 公众账号appid
        mch_id: wxConfig.mch_id, // 商户号,
        nonce_str: RANDOM_NUM, //随机字符串
        body: '宠爱会员充值',
        out_trade_no: outTradeId,
        total_fee: money * 100,
        spbill_create_ip: ip,
        notify_url: wxConfig.notify_url,
        trade_type: 'APP'
    }
    var sign = getSign(postData, 'creatPay')
    postData.sign = sign
    

    var  postXMLData = '<xml>'
        postXMLData += '<appid>'+postData.appid+'</appid>'
        postXMLData += '<mch_id>'+postData.mch_id+'</mch_id>'
        postXMLData += '<nonce_str>'+postData.nonce_str+'</nonce_str>'
        postXMLData += '<body>'+postData.body+'</body>'
        postXMLData += '<out_trade_no>'+postData.out_trade_no+'</out_trade_no>'
        postXMLData += '<total_fee>'+postData.total_fee+'</total_fee>'
        postXMLData += '<spbill_create_ip>'+postData.spbill_create_ip+'</spbill_create_ip>'
        postXMLData += '<notify_url>'+postData.notify_url+'</notify_url>'
        postXMLData += '<trade_type>'+postData.trade_type+'</trade_type>'
        postXMLData += '<sign>'+postData.sign+'</sign>'
        postXMLData += '</xml>'

    request({
      url: url,
      method: 'POST',
      body: postXMLData,
      agentOptions: {
            pfx: fs.readFileSync(PFX),
            passphrase: wxConfig.mch_id
      }
    }, function(err, response, body) {
        parseString(body, function(err, result) {
            let xml = {}
            for(let key in result.xml) {
              xml[key] = result.xml[key][0]
            }
            let params = pullPay(xml)
            params.outTradeId = outTradeId
            console.log('wxpay params===', params)

            resolve(params)
        })
    })
  })
}

// 用prepay_id 生成调起支付的所需参数
function pullPay(body) {

  var RANDOM_NUM = randomstring.generate({
    length: 16,
    charset: 'alphanumeric'
  })
  var timestamp = Date.parse(new Date())/1000

  var data = {
    appid: body.appid,
    partnerid: body.mch_id,
    prepayid: body.prepay_id,
    package: 'Sign=WXPay',
    noncestr: RANDOM_NUM,
    timestamp: timestamp
  }

  var sign = getSign(data)
  data.sign = sign

  return data

}


//订单查询
exports.orderQuery = function(outTradeId) {
  return new Promise(function(resolve, reject) {
    
    var url = 'https://api.mch.weixin.qq.com/pay/orderquery'

    var RANDOM_NUM = randomstring.generate({
      length: 16,
      charset: 'alphanumeric'
    })

    var postData = {
        appid: wxConfig.appid, // 公众账号appid
        mch_id: wxConfig.mch_id, // 商户号,
        out_trade_no: outTradeId,
        nonce_str: RANDOM_NUM
    }
    var sign = getSign(postData)
    postData.sign = sign
    
    var  postXMLData = '<xml>'
        postXMLData += '<appid>'+postData.appid+'</appid>'
        postXMLData += '<mch_id>'+postData.mch_id+'</mch_id>'
        postXMLData += '<out_trade_no>'+postData.out_trade_no+'</out_trade_no>'
        postXMLData += '<nonce_str>'+postData.nonce_str+'</nonce_str>'
        postXMLData += '<sign>'+postData.sign+'</sign>'
        postXMLData += '</xml>'

    request({
      url: url,
      method: 'POST',
      body: postXMLData
    }, function(err, response, body) {
      parseString(body, function(err, result) {
        let xml = {}
        for(let key in result.xml) {
          xml[key] = result.xml[key][0]
        }
        console.log('xml===', xml)
        xml.outTradeId = outTradeId
        resolve(xml)
      })
    })
  })
}


// 获取签名
function getSign(param, type) {

  var querystring = Object.keys(param).filter(function(key) {
    return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key)<0
      }).sort().map(function(key) {
        return key + '=' + param[key]
      }).join('&') + '&key=' + wxConfig.key


  return md5(querystring).toUpperCase()

}

exports.parseString = function(body) {
  return new Promise(function(resolve, reject) {
    parseString(body, function(err, result) {
      let xml = JSON.parse(result.xml)
      resolve(xml)
    })
  })
}






