//
//                                  _oo8oo_
//                                 o8888888o
//                                 88" . "88
//                                 (| -_- |)
//                                 0\  =  /0
//                               ___/'==='\___
//                             .' \\|     |// '.
//                            / \\|||  :  |||// \
//                           / _||||| -:- |||||_ \
//                          |   | \\\  -  /// |   |
//                          | \_|  ''\---/''  |_/ |
//                          \  .-\__  '-'  __/-.  /
//                        ___'. .'  /--.--\  '. .'___
//                     ."" '<  '.___\_<|>_/___.'  >' "".
//                    | | :  `- \`.:`\ _ /`:.`/ -`  : | |
//                    \  \ `-.   \_ __\ /__ _/   .-` /  /
//                =====`-.____`.___ \_____/ ___.`____.-`=====
//                                  `=---=`
//
//
//               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
//                          佛祖保佑         永不故障
//
'use strict'

const koa = require('koa')
const mongoose = require('mongoose')
const env = process.env.NODE_ENV = process.env.NODE_ENV || 'development'

if (env === 'development') {
  mongoose.set('debug', true)
}

const config = require('./config/config')

// 初始化数据库和模型
require('./config/mongoose')(config)
require('./config/models')

const app = module.exports = koa()

// 初始化koa
require('./config/koa')(app, config)

// Start app
app.listen(config.port)

console.log('Server listening on port ' + config.port)
