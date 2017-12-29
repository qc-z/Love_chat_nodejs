'use strict'

const ALY = require('aliyun-sdk')
const aliyun = require('../../config/config').aliyun
const ossSign = require('aliyun-oss-sign')

// 构建一个 Aliyun Client, 用于发起请求
// 构建Aliyun Client时需要设置AccessKeyId和AccessKeySevcret
// STS是Global Service, API入口位于华东 1 (杭州) , 这里使用sts API的主地址
let sts = new ALY.STS({
  accessKeyId: aliyun.accessKeyId,
  secretAccessKey: aliyun.secretAccessKey,
  endpoint: aliyun.endpoint,
  apiVersion: aliyun.apiVersion
})


// {"accessid":"6MKOqxGiGU4AUk44",
// "host":"http://post-test.oss-cn-hangzhou.aliyuncs.com",
// "policy":"eyJleHBpcmF0aW9uIjoiMjAxNS0xMS0wNVQyMDoyMzoyM1oiLCJjxb25kaXRpb25zIjpbWyJjcb250ZW50LWxlbmd0aC1yYW5nZSIsMCwxMDQ4NTc2MDAwXSxbInN0YXJ0cy13aXRoIiwiJGtleSIsInVzZXItZGlyXC8iXV19",
// "signature":"I2u57FWjTKqX/AE6doIdyff151E=",
// "expire":1446726203,"dir":"user-dir/"}



// 构造AssumeRole请求
exports.accessToken = function(testType) {
  // let  sessionId = Math.random().toString(36).substring(3, 11)

  return new Promise(function(resolve, reject) {
    // sts.assumeRole({
    //     Action: 'AssumeRole',
    //     // 指定角色Arn
    //     RoleArn: aliyun.arn,
    //     //设置Token的附加Policy，可以在获取Token时，通过额外设置一个Policy进一步减小Token的权限；
    //     //Policy: '{'Version':'1','Statement':[{'Effect':'Allow', 'Action':'*', 'Resource':'*'}]}',
    //     //设置Token有效期，可选参数，默认3600秒；
    //     DurationSeconds: 3600,
    //     RoleSessionName: sessionId
    // }, function (err, res) {
    //   if(err) {
    //     console.log(err)
    //     reject(Error('aliyun get accessToken error'))
    //   }
    //   console.log(res)
    //   if(res && res.Credentials) {
        let ossign = ossSign({
          accessId: aliyun.accessKeyId,
          accessKey: aliyun.secretAccessKey,
          // 超时时间 单位：毫秒
          expiration: 3600 * 1000,
          // 最大上传文件大小
          contentLength: 848576000
        })
        ossign.host = aliyun.ossHost
        let now  = Date.parse(new Date()) / 1000 + 3600
        ossign.expire = now
        ossign.dir = aliyun.adminDir
        // if(testType === 'star') {
        //   ossign.dir = aliyun.starDir
        // } else if(testType === 'skin') {
        //   ossign.dir = aliyun.skinDir
        // } else if(testType === 'stars') {
        //   ossign.dir = aliyun.starsDir
        // } else if(testType === 'face') {
        //   ossign.dir = aliyun.faceDir
        // }
      //   ossign.callback = function() {
      //     console.log(arguments)
      //   }
        console.log(ossign)
        resolve(ossign)
      // }

    // })
  })
}


// 构造AssumeRole请求
exports.accessSts = function(sessionId) {
  if(!sessionId) {
    sessionId = Math.random().toString(36).substring(3, 11)
  }

  return new Promise(function(resolve, reject) {
    sts.assumeRole({
        Action: 'AssumeRole',
        // 指定角色Arn
        RoleArn: aliyun.arn,
        //设置Token的附加Policy，可以在获取Token时，通过额外设置一个Policy进一步减小Token的权限；
        //Policy: '{'Version':'1','Statement':[{'Effect':'Allow', 'Action':'*', 'Resource':'*'}]}',
        //设置Token有效期，可选参数，默认3600秒；
        DurationSeconds: 3600,
        RoleSessionName: sessionId
    }, function (err, res) {
      if(err) {
        console.log(err)
        reject(Error('aliyun get accessToken error'))
      }
      console.log(res)
      if(res && res.Credentials) {
        resolve(res)
      }

    })
  })
}