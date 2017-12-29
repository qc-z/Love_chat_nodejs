'use strict'

const logger = require('koa-logger')
const json = require('koa-json')
const compress = require('koa-compress')
const lusca = require('koa-lusca')
const Router = require('koa-router')
const session = require('koa-session')
const cors = require('koa-cors')
const router = new Router()
const bodyParser = require('koa-body')
const serve = require('koa-static')
const errors = require('../app/errors/middleware')

module.exports = function(app, config) {
  // if (config.env == 'development') app.use(logger())
  app.use(logger())
  app.use(errors.error())
  app.use(json({pretty: false, param: 'pretty'}))

  app.name = config.name
  app.env = config.env

  app.use(serve('./public'))
  // app.use(serve('../www'))
  app.use(bodyParser({
    formLimit: '10mb',
    formidable:{uploadDir: './public/uploads', keepExtensions: true,},    //This is where the files would come
    multipart: true,
    urlencoded: true
  }))

  app.keys = ['sea', 'youlovechat']
  app.use(session({maxAge: 864000000}, app))

  app.use(lusca({
    csrf: false,
    csp: {},
    xframe: 'SAMEORIGIN',
    p3p: 'ABCDEF',
    hsts: {maxAge: 31536000, includeSubDomains: true},
    xssProtection: true
  }))

  app.use(cors({credentials: true}))

  // app.use(passport.initialize())
  // app.use(passport.session())
  // require('./passport')(passport)
  // app.use(function *(next) {
  //   var client = this.session.client

  //   if (client && client._id) {
  //     this.session.client = yield Client.findOne({_id: client._id}).exec()
  //     this.state.client = this.session.client
  //   }
  //   else {
  //     this.state.client = null
  //   }

  //   yield next
  // })


  require('./routes')(router)

  app.use(errors.error())

  app
    .use(router.routes())
    .use(router.allowedMethods())

  app.use(compress({
    filter: function (content_type) {
      return /text/i.test(content_type)
    },
    threshold: 2048,
    flush: require('zlib').Z_SYNC_FLUSH
  }))
}
