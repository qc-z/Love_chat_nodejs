'use strict'


const multer = require('koa-multer')

const storage = {
  //设置上传后文件路径，uploads文件夹会自动创建。
  destination: function (req, file, cb) {
      cb(null, __dirname+'../uploads')
  },
  //给上传文件重命名，获取添加后缀名
  filename: function (req, file, cb) {
      var fileFormat = (file.originalname).split('.')
      var postfix = fileFormat[fileFormat.length - 1]
      if(postfix!='jpg'||postfix!='png')
      {
          postfix='jpg'
      }
      cb(null, file.fieldname + '-' + Date.now() + '.' + postfix)
  }
}

module.exports = multer({ storage:storage })