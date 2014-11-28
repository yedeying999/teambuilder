define(function(require, exports, module) {
  "use strict";
  require('jquery');
  var tools = require('./tools');
  var $body = $('body');
  $body.on('click', '.add-people', function(e) {
    tools.getModel('add_people', 'add_people', function() {
      $('.model .email').focus();
    });
  });
  $body.on('click', '.remove-people', function(e) {
    tools.getModel('remove_people', 'remove_people');
  });
  $body.on('click', '.exit-group', function(e) {
    tools.getModel('exit_group', 'exit_group');
  });
  $body.on('click', '.remove-group', function(e) {
    tools.getModel('remove_group', 'remove_group');
  });
  $body.on('click', '.edit-profile', function(e) {
    return false;
  });
  module.exports = {
    addPeople: function() {
      var $email = $('.add-people-inner .email');
      var email = $email.val();
      if(email === '') {
        tools.showInfo('邮箱名不能为空');
        $email.focus();
        return;
      }
      if(!tools.checkMailFormat(email)) {
        tools.showInfo('邮箱名格式错误');
        $email.focus();
        return; 
      }
      $.post('/add_people', {email: email}, function(data) {
        if(typeof data.code === 'number') {
          tools.showInfo(data.info);
          if(data.code === 0) {
            $('.model .close').trigger('click');
          } else if(data.code === 2) {
            $('.model .email').val('').focus();
          }
        }
      });
    },
    removePeople: function() {
      var $checkbox = $('.model input[type="checkbox"]:checked');
      var uid = [];
      $checkbox.each(function(index, element) {
        uid.push(element.getAttribute('data-uid'));
      });
      if(uid.length === 0) {
        tools.showInfo('你还没有选择任何人');
        return;
      }
      uid = JSON.stringify(uid);
      $.post('/remove_people', {uid: uid}, function(data) {
        if(typeof data.code === 'number') {
          tools.showInfo(data.info);
          if(data.code === 0) {
            setTimeout(function() {
              location.reload(true);
            }, 1000);
          }
        }
      });
    },
    exitGroup: function() {
      $.post('/exit_group', {}, function(data) {
        if(typeof data.code === 'number') {
          tools.showInfo(data.info);
          if(data.code === 0) {
            setTimeout(function() {
              location.href = "/";
            }, 1000);
          }
        }
      });
    },
    removeGroup: function() {
      $.post('/remove_group', {}, function(data) {
        if(typeof data.code === 'number') {
          tools.showInfo(data.info);
          if(data.code === 0) {
            setTimeout(function() {
              location.href = '/joingroup';
            }, 1000);
          }
        }
      });
    }
  };
});