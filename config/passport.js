'use strict'

var mongoose = require('mongoose')
var config = require('./config')
var User = mongoose.model('User')
var Userred = mongoose.model('Userred')
var Usercoupon = mongoose.model('Usercoupon')
var WeixinStrategy = require('passport-weixin').Strategy

module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user._id)
  })

  passport.deserializeUser(function(id, done) {
    User.findOne({
        _id: id
      }, '-salt -hashed_password', function(err, user) {
        if(user) {
          done(err, user)
        } else {
          Userred.findOne({
            _id: id
          }, '-salt -hashed_password', function(err, userred) {
            done(err, userred)
          })
        }
    })
  })

  var wechatCf = config.wechat

  // 报名排名
  passport.use('loginByWeixinClient',new WeixinStrategy({
    clientID: wechatCf.appID
    , clientSecret: wechatCf.appSecret
    , callbackURL: wechatCf.callbackURL
    , requireState: false
    , authorizationURL: 'https://open.weixin.qq.com/connect/oauth2/authorize' //[公众平台-网页授权获取用户基本信息]的授权URL 不同于[开放平台-网站应用微信登录]的授权URL 
    , scope: 'snsapi_userinfo' //[公众平台-网页授权获取用户基本信息]的应用授权作用域 不同于[开放平台-网站应用微信登录]的授权URL 
  }, function(accessToken, refreshToken, profile, done) {
    profile = profile._json
    User.findOne({
      'openid': profile.openid
    }, function(err, user) {
      if (err) {
        console.log(err)
      }
      if(!user) {
        user = new User({
          openid: profile.openid,
          nickname: profile.nickname,
          username: profile.nickname,
          sex: profile.sex,
          province: profile.province,
          city: profile.city,
          country: profile.country,
          headimgurl: profile.headimgurl,
          language: profile.language,
          privilege: profile.privilege
        })
        user.save(function(error) {
          console.log(error)
          return done(error, user)
        })
      }
      else {
        return done(err, user)
      }
    })
  }))

  // 优惠卷 微信 h5 活动
  passport.use('wxcoupon',new WeixinStrategy({
    clientID: wechatCf.appID
    , clientSecret: wechatCf.appSecret
    , callbackURL: wechatCf.callbackURLCoupon
    , requireState: false
    , authorizationURL: 'https://open.weixin.qq.com/connect/oauth2/authorize' //[公众平台-网页授权获取用户基本信息]的授权URL 不同于[开放平台-网站应用微信登录]的授权URL 
    , scope: 'snsapi_userinfo' //[公众平台-网页授权获取用户基本信息]的应用授权作用域 不同于[开放平台-网站应用微信登录]的授权URL 
  }, function(accessToken, refreshToken, profile, done) {
    profile = profile._json
    Usercoupon.findOne({
      'openid': profile.openid
    }, function(err, usercoupon) {
      if (err) {
        console.log(err)
      }
      if(!usercoupon) {
        usercoupon = new Usercoupon({
          openid: profile.openid,
          nickname: profile.nickname,
          username: profile.nickname,
          sex: profile.sex,
          province: profile.province,
          city: profile.city,
          country: profile.country,
          headimgurl: profile.headimgurl,
          language: profile.language,
          privilege: profile.privilege
        })
        usercoupon.save(function(error) {
          console.log(error)
          return done(error, usercoupon)
        })
      }
      else {
        return done(err, usercoupon)
      }
    })
  }))


  // 现金红包 授权登录
  passport.use('weixinRed',new WeixinStrategy({
    clientID: wechatCf.appID
    , clientSecret: wechatCf.appSecret
    , callbackURL: wechatCf.callbackURLRed
    , requireState: false
    , authorizationURL: 'https://open.weixin.qq.com/connect/oauth2/authorize' //[公众平台-网页授权获取用户基本信息]的授权URL 不同于[开放平台-网站应用微信登录]的授权URL 
    , scope: 'snsapi_userinfo' //[公众平台-网页授权获取用户基本信息]的应用授权作用域 不同于[开放平台-网站应用微信登录]的授权URL 
  }, function(accessToken, refreshToken, profile, done) {

    profile = profile._json

    Userred.findOne({
      'openid': profile.openid
    }, function(err, userred) {
      if (err) {
        console.log(err)
      }
      if(!userred) {
        userred = new Userred({
          openid: profile.openid,
          type: 'redPacket',
          nickname: profile.nickname,
          username: profile.nickname,
          sex: profile.sex,
          province: profile.province,
          city: profile.city,
          country: profile.country,
          headimgurl: profile.headimgurl,
          language: profile.language,
          privilege: profile.privilege
        })
        userred.save(function(error) {
          console.log(error)
          return done(error, userred)
        })
      }
      else {
        return done(err, userred)
      }
    })
  }))

}
