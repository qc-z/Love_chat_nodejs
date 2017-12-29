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