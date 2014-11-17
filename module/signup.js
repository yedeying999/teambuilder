var signup = {
  getVerifyHtml: function (str) {
    var setting = require('../settings/global');
    return '<a href="http://' + setting.url + '/?' + str + '">点击验证</a>';
  },
  encodePassword: function(ori, time) {
    var crypto = require('crypto');
    var sha1 = crypto.createHash('sha1');
    sha1.update(ori + time);
    return sha1.digest('hex');
  },
  checkMailFormat: function(email) {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
  },
  checkPasswordFormat: function(pwd) {
    return /^[0-9a-zA-Z]+$/.test(pwd);
  },
  checkMailRepeat: function(email, res, callback) {
    var db = require('./db');
    var sql = 'select * from user where email = "' + email + '"';
    db.query(sql, function(err, rows, fields) {
      if(err) {
        res.send({code: 1, info: '数据库错误，请联系管理员'});
        throw err;
      } 
      if(rows && rows.length >= 1) {
        res.send({code: 1, info: '该邮箱已注册，可以尝试进行密码找回'});
        return;
      }
      sql = 'select * from tmpuser where email = "' + email + '"';
      db.query(sql, function(err, rows, fileds) {
        if(err) {
          res.send({code: 1, info: '数据库错误，请联系管理员'});
        }
        if(rows && rows.length >= 1) {
          res.send({code: 2, info: '邮件已经发送，请前往邮箱验证'});
          return;
        }
        callback();
      });
    });
  },
  checkMailRepeatBeta: function(email, res, callback) {
    var db = require('./db');
    var sql = 'select * from user where email = "' + email + '"';
    db.query(sql, function(err, rows, fields) {
      if(err) {
        res.send({code: 1, info: '数据库错误，请联系管理员'});
        throw err;
      }
      if(rows && rows.length >= 1) {
        res.send({code: 1, info: '该邮箱已注册，可以尝试进行密码找回'});
        return;
      }
      callback();
    });
  },
  validate: function(email, name, password, res) {
    if(!this.validateEmail(email, res)) {
      return false;
    }
    if(!name || name.length < 1) {
      res.send({code: 1, info: '姓名不能为空'});
      return false;
    }
    if(name.length > 20) {
      res.send({code: 1, info: '姓名长度不宜多于20'});
      return false;
    }
    if(!password || password.length < 1) {
      res.send({code: 1, info: '密码不能为空'});
      return false;
    }
    if(password.length < 6 || password.length > 50) {
      res.send({code: 1, info: '密码长度宜在6~50之间'});
      return false;
    }
    if(!this.checkPasswordFormat(password)) {
      res.send({code: 1, info: '密码只能包含数字和字母'});
      return false;
    }
    return true;
  },
  validateEmail: function(email, res) {
    if(!email || email.length < 1) {
      res.send({code: 1, info: '邮箱不能为空'});
      return false;
    }
    if(!this.checkMailFormat(email)) {
      res.send({code: 1, info: '邮箱格式错误'});
      return false;
    }
    return true;
  },
  saveTempInfo: function(email, name, time, password, res, callback) {
    var db = require('./db');
    var tid = this.encodePassword(email, time);
    var sql = 'insert into tmpuser (uid, email, username, password, timestamp, createtime, tid) values (null, "' + email + '", "' + name + '", "' + password + '", current_timestamp, "' + time + '", "' + tid + '")';
    db.query(sql, function(err, rows, fields) {
      if(err) {
        res.send({code: 1, info: '数据库错误，请联系管理员'});
        throw err;
      }
      callback(tid);
    });
  },
  sendMail: function(email, tid, res) {
    var mailSetting = require('../settings/mail');
    var mailTransporter = require('./mail');
    var mailOptions = {
      from: 'teambuilder<' + mailSetting.auth.user + '>',
      subject: 'TeamBuilder 验证邮件',
      html: this.getVerifyHtml('tid=' + tid),
      to: email
    };
    mailTransporter.sendMail(mailOptions, function(err, info) {
      if(err) {
        res.send({code: 1, info: '发送邮件失败，请联系管理员'});
      } else {
        res.send({code: 0, info: '注册成功，请前往邮箱验证'});
      }
    });
  },
  sendAgain: function(email, res) {
    var that = this;
    var db = require('./db');
    var sql = 'select tid from tmpuser where email = "' + email + '"';
    db.query(sql, function(err, rows, fields) {
      if(err) {
        res.send({code: 1, info: '数据库错误，请联系管理员'});
        throw err;
      } else if(rows && rows.length >= 1) {
        var tid = rows[0]['tid'];
        that.sendMail(email, tid, res);
      } else {
        res.send({code: 1, info: '数据库错误，请联系管理员'});
      }
    });
  }
};
module.exports = signup;