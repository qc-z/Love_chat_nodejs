'use strict'

var path = require('path')
var rootPath = path.join(__dirname, '/../..')

module.exports = {
  root: rootPath,
  sessionSecret: 'LOVECHATFORYOU',
  port: 8888,
  name: 'loveChat',
  hostname: 'lovechat.leglear.com',
  aliyun: {
    accessKeyId: 'LTAIDACFnyvEfVHn',
    secretAccessKey: 'x9wvJjtxDTznUSvluRqKnTGX0yOTHs',
    endpoint: 'https://sts.aliyuncs.com',
    apiVersion: '2015-04-01',
    arn: 'acs:ram::1071268284005178:role/arpt-user-role',
    ossHost: 'http://love-chat.oss-cn-shanghai.aliyuncs.com',
    manDir: 'man/',
    adminDir: 'admin/',
    womanDir: 'woman/'
  },
  gpaykey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgzvDTZabao2lL4ylw271BJB13Hrhn/V+UmcslDKBeuOoIFuYqftY8e68nGRy/tM7nF2oLpRXDNU5GZY8iz6jcJp6n6SdeI3yIEE0NKiTlSOc3rZ6PsVv4k2XrwMbbMDhUmz2UnYh708x36MPENuAVGMWdSW2N3SuqPNh/UzuC1qG//Ck0ftC1osGHqt/oY5BSC+8pFmFEykrZKIdVt76ktUuDJE6tTbO5OiZAy6F3YuMI3OBjmzz23kYZbq6T2q6Y5vQOjK6zz54KWD3gqTY1j5/wqCR8s5IBLHDUJmHTW+q5u+QrVZdRbJXx55r2riSz9vXbLeQt/Uj9s6mqhBnUQIDAQAB',
  jpush: {
    appKey: '83dadc83ea236b0c9be73ae3',
    masterSecret: '961d7822774c6e13024abb83'
  },
  im: {
    url: 'https://a1.easemob.com/1161171017115877/lovesudy/',
    host: 'https://a1.easemob.com/',
    org_name: '1161171017115877',
    app_name: 'lovesudy',
    grant_type: 'client_credentials',
    client_id: 'YXA6DqIbILLhEeebSSXK4AFjeA',
    client_secret: 'YXA6lUyYUhtH-JKzNIZCy7yGdPgvzcg'
  },
  bossjpush: {
    appKey: '8861fb6fedcb1196239132d5',
    masterSecret: '42b29864d245eba1c9d17ed2'
  },
  superCode: '9527',
  amap: {
    key: '389880a06e3f893ea46036f030c94700',
    hostip: 'http://restapi.amap.com/v3/ip',
    hostgeo: 'http://restapi.amap.com/v3/geocode/geo'
  },
  facepp: {
    faceppv3_apikey:'2Fk7AW94itM4RC8Bgn0HJP4NhC2jIJ5o',
    faceppv3_apisecret:'yz855SYnojZ7EPbzWTcgcEcNnhvyY0h2',
    faceppv3_apiurl:'https://api-cn.faceplusplus.com/facepp/v3'
  },
  pay: {
    meal_a: {
      value: 98,
      time: 604800000
    },
    meal_b: {
      value: 188,
      time: 1296000000
    },
    meal_c: {
      value: 388,
      time: 2419200000
    },
    meal_d: {
      value: 898,
      time: 7776000000
    }
  },
  appleProductID: {
    meal_a: 'seven_member',
    meal_b: 'ninety_member',
    meal_c: 'twentyeight_member',
    meal_d: 'fourteen_member'
  },
  appleProductIDBossMan: {
    meal_a: 'woman_zgMembers',
    meal_b: 'bj_members',
    meal_c: 'gj_members',
    meal_d: 'gw_members'
  },
  appleProductIDBossWuMen: {
    meal_a: 'man_zgMembers',
    meal_b: 'gz_members',
    meal_c: 'jz_members',
    meal_d: 'nw_members'
  },
  appleProductIDBossManGent: {
    meal_c: 'fx_gj_members',
    meal_d: 'fx_gw_members'
  },
  appleProductIDBossWuMenGent: {
    meal_c: 'fx_jz_members',
    meal_d: 'fx_nw_members'
  },
  gpayProductIDBossMan: {
    meal_a: 'meal_a_m_n',
    meal_b: 'meal_b_m_n',
    meal_c: 'meal_c_m_n',
    meal_d: 'meal_d_m_n'
  },
  gpayProductIDBossWuMen: {
    meal_a: 'meal_a_f_n',
    meal_b: 'meal_b_f_n',
    meal_c: 'meal_c_f_n',
    meal_d: 'meal_d_f_n'
  },
  gpayProductIDBossManGent: {
    meal_c: 'meal_c_m_d',
    meal_d: 'meal_d_m_d'
  },
  gpayProductIDBossWuMenGent: {
    meal_c: 'meal_c_f_d',
    meal_d: 'meal_d_f_d'
  },
  payBossMan: {
    meal_a: {
      value: 238,
      usd: 36.99,
      time: 604800000
    },
    meal_b: {
      value: 398,
      usd: 59.99,
      time: 1209600000
    },
    meal_c: {
      value: 698,
      usd: 99.99,
      fxvalue: 398,
      fxusd: 59.99,
      time: 2419200000
    },
    meal_d: {
      value: 998,
      usd: 149.99,
      fxvalue: 698,
      fxusd: 99.99,
      time: 7776000000
    }
  },
  payBossWoman: {
    meal_a: {
      value: 98,
      usd: 14.99,
      time: 604800000
    },
    meal_b: {
      value: 168,
      usd: 25.99,
      time: 1209600000
    },
    meal_c: {
      value: 298,
      usd: 45.99,
      fxvalue: 168,
      fxusd: 25.99,
      time: 2419200000
    },
    meal_d: {
      value: 498,
      usd: 74.99,
      fxvalue: 298,
      fxusd: 45.99,
      time: 7776000000
    }
  },
  couponRule: {
    vip: 'no',
    chat: 'yes'
  },
  vipLevelBossMan: [0, 238, 398, 698, 998],
  vipLevelBossWoman: [0, 98, 168, 298, 498],
  vipLevel: [0, 98, 188, 388, 898],
  vipText: {
    vip0: '普通用户',
    vip1: '尊贵会员',
    vip2: '黄金会员',
    vip3: '钻石会员',
    vip4: '至尊皇冠会员'
  },
  vipTextBossMan: {
    vip0: '普通用户',
    vip1: '尊贵会员',
    vip2: '伯爵会员',
    vip3: '公爵会员',
    vip4: '国王会员'
  },
  vipTextBossWoman: {
    vip0: '普通用户',
    vip1: '尊贵会员',
    vip2: '公主会员',
    vip3: '郡主会员',
    vip4: '女王会员'
  },
  log4js_config: {
    appenders: [
      {type: 'console'},//控制台输出
      {
          type: 'dateFile',//文件输出
          filename: __dirname + '/../logs/arpt.log',
          pattern: '-yyyy-MM-dd',
          maxLogSize: 20480,
          alwaysIncludePattern: false
      }
    ],
    replaceConsole: true
  }
}
