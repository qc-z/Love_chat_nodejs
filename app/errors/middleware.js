'use strict'

const mongoose = require('mongoose')
const JsonError = require('./errors').JsonError
// const PageError = require('./errors').PageError

var _Error = mongoose.model('Error')

exports.error = function () {
  return function *(next) {
    try {
      yield* next
    }
    catch (e) {
      try {
        // record errors as Mongoose-modeled documents
        var _error = new _Error({
          ip: this.ip,
          method: this.method,
          referer: this.header.referer,
          stack: e.stack,
          status: e.status || 500,
          url: this.url
        })

        yield _error.save()
      }
      catch (_err) {
        console.error(_err.stack || _err)
        // print error logging error to console, but do not overwrite original error
      }

      let status = e.status || 500
      let message = e.message || '服务器错误'

      if (e instanceof JsonError) { // 错误是 json 错误
        this.body = {
          'status': status,
          'message': message
        }

        if (status === 500) {
          // 触发 koa 统一错误事件，可以打印出详细的错误堆栈 log
          this.app.emit('error', e, this)
        }
        return
      }

      this.status = status

      // 根据 status 渲染不同的页面
      if (status === 403) {
        if (this.render) {
          yield this.render('403', {
            err: e,
            page: 'static'
          })
        }
        else {
          this.body = {code: '403', error: {
            err: e,
            page: 'static'
          }}
        }
      }
      if (status === 404) {
        if (this.render) {
          yield this.render('404', {
            err: e,
            page: 'static'
          })
        }
        else {
          this.body = {code: '404', error: {
            err: e,
            page: 'static'
          }}
        }
      }
      if (status === 500) {
        if (this.render) {
          yield this.render('500', {
            err: e,
            page: 'static'
          })
        }
        else {
          this.body = {code: '500', error: {
            err: e,
            page: 'static'
          }}
        }
        // 触发 koa 统一错误事件，可以打印出详细的错误堆栈 log
        this.app.emit('error', e, this)
      }
    }
  }
}
