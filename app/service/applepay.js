'use strict'

// const request = require('request-promise')
const https = require('https')
// const querystring = require('querystring')


/**
* @brief 跟苹果服务充值服务器进行检验
* @param receiptData IOS充值回调的transaction.transactionReceipt base64Encoding
* @param responder 验证回调
* @param inReview 是否处于审核阶段
*/

// exports.verifyReceipt = function(receiptData, inReview) {
// 	return new Promise(function(resolve, reject) {
// 		let host = inReview ? 'https://sandbox.itunes.apple.com':'https://buy.itunes.apple.com'
// 		let receiptEnvelope = {'receipt-data': receiptData}

//     let formData = querystring.stringify(receiptEnvelope)
//     let contentLength = formData.length

//     let opptions = {
//       headers: {
//         'Content-Length': contentLength,
//         'Content-Type': 'application/x-www-form-urlencoded'
//       },
//       uri: host,
//       body: formData,
//       method: 'POST'
//     }

// 		request.post(opptions)
//         .then(function (body) {
//             resolve(body)
//         })
//         .catch(function(err) {
//         	console.error(err, new Date())
//         	console.log('remote search applepay err unavailable', new Date())
//         	reject(Error('remote search apple pay unavailable'))
//         })
// 	})
// }

exports.verifyReceipt = function(receiptData,inReview){
  return new Promise(function(resolve, reject) {
    var receiptEnvelope = {"receipt-data": receiptData};
    var receiptEnvelopeStr = JSON.stringify(receiptEnvelope);
    var options = {
        host: inReview?'sandbox.itunes.apple.com':'buy.itunes.apple.com',
        port: 443,
        path: '/verifyReceipt',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(receiptEnvelopeStr)
        }
    };

    var req = https.request(options, function(res) {
        var _data='';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            _data += chunk;
        });
        res.on('end', function () {
            console.log("applepay body: " + _data);
            resolve(_data)
        });
    });

    req.write(receiptEnvelopeStr);
    req.end();
  })
};




