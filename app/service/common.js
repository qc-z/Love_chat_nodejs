'use strict'


const excel = require('node-excel-to-json')


// 通知所有用户
exports.excelToJson = function(sex) {
  return new Promise(function(resolve, reject) {
    let file = process.cwd() + '/public/weikehu.xlsx'
    if(sex === 2 || sex === '2') {
  		file = process.cwd() + '/public/weikehu_woman.xlsx'
    }
    console.log(file)
    excel(file, function(err, output) {
      // console.log(err, output)
      resolve(output)
    })
  })
}
