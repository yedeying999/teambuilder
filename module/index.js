module.exports = {
  sortActivity: function(project) {
    project.forEach(function(pro) {
      var activity = pro.activity;
      activity.sort(function(x, y) {
        if(x.time < y.time) return 1;
        if(x.time > y.time) return -1;
        return 0;
      });
    });
  },
  generateTask: function(pid, activity, obj, event) {
    var db = require('./db');
    var sql = 'select task.tid as id, task.title as title, unix_timestamp(task.createtime) as time, user.username as username, user.uid as uid from task, user where user.uid = task.creater && task.pid = ' + pid;
    db.query(sql, function(err, rows) {
      if(err) throw err;
      for(var i = 0; i < rows.length; i++) {
        activity.push({
          type: 'task',
          id: rows[i]['id'],
          title: rows[i]['title'],
          time: rows[i]['time'],
          people: rows[i]['username'],
          uid: rows[i]['uid']
        });
      }
      obj.cnt++;
      if(obj.cnt == obj.len) {
        event.emit('add');
      }
    });
  },
  generateFile: function(pid, activity, obj, event) {
    var db = require('./db');
    var sql = 'select file.fid as id, file.filename as filename, unix_timestamp(file.uploadtime) as time, user.username as username, user.uid as uid from file, user where user.uid = file.uploader && file.type = "0" && file.id = ' + pid;
    db.query(sql, function(err, rows) {
      if(err) throw err;
      for(var i = 0; i < rows.length; i++) {
        activity.push({
          type: 'file',
          id: rows[i]['id'],
          title: rows[i]['filename'],
          time: rows[i]['time'],
          people: rows[i]['username'],
          uid: rows[i]['uid']
        });
      }
      obj.cnt++;
      if(obj.cnt === obj.len) {
        event.emit('add');
      }
    })
  },
  generateComment: function(pid, activity, obj, event) {
    var db = require('./db');
    var tools = require('./tools');
    var sql = 'select comment.cid as id, comment.content as content, unix_timestamp(comment.time) as time, user.username as username, user.uid as uid from comment, user where user.uid = comment.uid && comment.type = "0" && comment.id = ' + pid;
    db.query(sql, function(err, rows) {
      if(err) throw err;
      for(var i = 0; i < rows.length; i++) {
        activity.push({
          type: 'comment',
          id: rows[i]['id'],
          title: tools.shortenString(rows[i]['content'], 20),
          time: rows[i]['time'],
          people: rows[i]['username'],
          uid: rows[i]['uid']
        });
      }
      obj.cnt++;
      if(obj.cnt === obj.len) {
        event.emit('add');
      }
    })
  },
  generateProject: function(pid, activity, obj, event) {
    var db = require('./db');
    var tools = require('./tools');
    var sql = 'select user.username as name, user.uid as uid, unix_timestamp(project.createtime) as time, project.name as title from user, project where user.uid = project.creater and project.pid = ' + pid;
    db.query(sql, function(err, rows) {
      if(err) throw err;
      var row = rows[0];
      activity.push({
        type: 'project',
        id: pid,
        title: row['title'],
        time: row['time'],
        people: row['name'],
        uid: row['uid']
      });
      obj.cnt++;
      if(obj.cnt === obj.len) {
        event.emit('add');
      }
    })
  },
  generateTeam: function(email, data, cnt, event) {
    var db = require('./db');
    data.team = [];
    var sql = 'select team.username as name, team.uid as uid, self.uid as self from user team, user self where team.gid = self.gid and self.email = "' + email + '" group by team.createtime desc';
    db.query(sql, function(err, rows) {
      if(err) throw err;
      rows.forEach(function(row, index) {
        data.team.push({
          name: row['name'],
          uid: row['uid'],
          role: row['uid'] === row['self'] ? 'self' : 'teammate'
        });
        if(index === rows.length - 1) {
          cnt.cnt++;
          if(cnt.cnt === cnt.len) {
            event.emit('finish');
          }
        }
      });
    });
  },
  generatePage: function(email, callback) {
    var that = this;
    var emitter = require('events').EventEmitter;
    var event = new emitter();
    var db = require('./db');
    var data = {};
    data.email = email;
    var sql = 'select project.pid as pid, project.name as name, unix_timestamp(project.createtime) as time, user.uid as uid, groups.name as groupname from project, user, groups where groups.gid = project.gid && project.gid = user.gid && user.email = "' + email + '" order by project.createtime desc';
    db.query(sql, function(err, rows) {
      if(err) throw err;
      if(rows.length > 0) {
        data.groupname = rows[0]['groupname'];
      }
      var cnt = {};
      cnt.cnt = 0;
      cnt.len = rows.length + 1;
      rows.forEach(function(row, index) {
        var obj = { cnt: 0, len: 4 };
        data.project = data.project || [];
        data.project.push({
          name: row['name'],
          pid: row['pid'],
          activity: []
        });
        var activity = data.project[index].activity;
        that.generateComment(row['pid'], activity, obj, event);
        that.generateFile(row['pid'], activity, obj, event);
        that.generateTask(row['pid'], activity, obj, event);
        that.generateProject(row['pid'], activity, obj, event);
      });
      that.generateTeam(email, data, cnt, event);
      event.on('add', function() {
        cnt.cnt++;
        if(cnt.cnt === cnt.len) {
          event.emit('finish');
        }
      });
    });
    event.on('finish', function() {
      that.sortActivity(data.project);
      callback(data);
    });
  },
  addProject: function(email, data, res) {
    var db = require('./db');
    if(data.title.length === 0) {
      res.send({ code: 1, info: '项目名称不能为空'} );
      return;
    }
    var sql = 'select user.uid as uid, groups.gid as gid from user, groups where user.gid = groups.gid and user.email = "' + email + '"';
    db.query(sql, function(err, rows) {
      if(err) throw err;
      var uid = rows[0]['uid'];
      var gid = rows[0]['gid'];
      var sql = 'insert into project (gid, creater, name, description, status) values (' + gid + ', ' + uid + ', "' + data.title + '", "' + data.description + '", 0)';
      db.query(sql, function(err) {
        if(err) throw err;
        res.send({ code: 0, info: '创建成功' });
      });
    });
  }
};