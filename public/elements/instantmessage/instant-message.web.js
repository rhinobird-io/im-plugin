var hostname = window.location.hostname + ':' + window.location.port;
var serverUrl = 'http://' + hostname + '/im';
var defaultChannel = 'default';


Polymer({
  boxTapped: function () {
    this.$.textInput.focus();
  },
  messages: [],
  connectinStatus: "connecting",

  /**
   * from platform, get all teams the current user belongs to
   */
  myTeam: [],

  /**
   * @key : teamId
   * @value: array, all the users in this team
   */
  teamMemberMap: {},

  /**
   * unique
   * all the team members without duplication
   */
  allMyTeamMember: [],

  /**
   * key : userId
   * value : user
   */
  userIdTeamMemberMap: {},
  privateGroup: [],
  pluginName: 'instantmessage',
  unread: {},
  users: [], // the users in this room

  ready: function () {
    this.scrollToBottom(100);
    var self = this;
    if (!Notification) {
      alert('Please use a modern version of Chrome');
      return;
    }

    if (Notification.permission !== "granted"){
      Notification.requestPermission();
    }
    window.onkeypress = function (event) {
      if (event.keyCode === 13 && (!self.message || self.message === '')) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && event.keyCode === 13) {
        return;
      }
      if (!event.shiftKey && event.keyCode === 13) {
        self.sendMessage();
        event.preventDefault();
        return;
      }
      self.$.textInput.focus();
    }
  },

  /**
   * Only in domReady the userId is filled
   */
  domReady: function () {

    var self = this;

    $.get('/platform/loggedOnUser').fail(function () {
      document.querySelector('app-router').go('/');
      callback('not login');
      return;
    }).done(function (user) {
      self.currentUser = user;
      async.waterfall([

        /**
         * get the team that login user belong
         */
          function (callback) {
          $.get('/platform/users/' + self.currentUser.id + '/teams')
            .done(function (team) {
              self.myTeam = team;
              callback();
            });
        },


        /**
         * load socket.io.js
         * @param callback
         */
          function (callback) {
          $.getScript(serverUrl + '/socket.io/socket.io.js').done(function () {
            callback();
          }).fail(function () {
            self.connectinStatus = "Cannot connect to server. Please refresh.";
            callback(self.connectinStatus);
          });
        },

        /**
         * load the channels current user has
         * @param callback
         */
          function (callback) {
          if (self.myTeam.length === 0) {
            self.$.noGroupDlg.open();
            callback('no groups found for current user');
            return;
          } else if (self.channelName === defaultChannel) {
            // by default using the default setting, later use localstorage
            self.channelName = self.myTeam[0].name;
            document.querySelector('app-router').go('/' + self.pluginName + '/channels/' + self.channelName);
          } else {
            callback();
          }
        },

        /**
         * try to initialize current channel (if it is private, it might not be created in db)
         * @param callback
         */
          function (callback) {
          callback();
        },

        /**
         * get users in team
         */
          function (callback) {
          var teamMembers = [];
          async.each(self.myTeam,
            function (team, cb) {
              $.get('/platform/teams/' + team.id + '/users')
                .done(function (users) {
                  self.teamMemberMap[team.id] = [];
                  users.forEach(function (user) {
                    self.teamMemberMap[team.id].push(user);
                    if (user.id !== self.currentUser.id) {
                      teamMembers.push(user);
                    }
                  });
                  cb();
                });
            }, function (err) {
              if (!err) {
                self.allMyTeamMember = self.getUniqueMember(teamMembers);
                self.allMyTeamMember.forEach(function(member){
                  self.userIdTeamMemberMap[member.id] = member;
                });
                callback();
              }
            });
        },

        /**
         * get all team member channel
         * assign the channel id of instant message db
         * @param callback
         */
          function (callback) {
          $.post(serverUrl + '/api/userId/' + self.currentUser.id + '/allChannels',
            {'teamMembers': self.allMyTeamMember, 'myTeam': self.myTeam},
            function (data) {
              self.allMyTeamMember = data.teamMembers;
              self.myTeam = data.myTeam;
              //self.privateGroup = data.privateGroup;
              callback();
            });
        },

        /**
         * get current channel
         * @param callback
         */
          function (callback) {


          var channelNameMappedId = -1;
          if (self.channelName.indexOf('@') === 0) {
            var name = self.channelName.substr(1);
            self.allMyTeamMember.forEach(function (teamMember) {
              if (name === teamMember.realname) {
                self.channel = {id: teamMember.channelId};
                callback(null, self.channel);
              }
            });
          } else {
            self.myTeam.forEach(function (team) {
              if (team.name === self.channelName) {
                self.channel = {id: team.channelId, teamId: team.id};
                callback(null, self.channel);
              }
            });
          }

        },


        /**
         * extra operation if the channel is private
         * @param channel
         * @param callback
         */
          function (channel, callback) {
          if (!channel.isPrivate) {
            console.log('current channel is not private');
            callback();
          } else {
            console.log('current channel is private');
            callback();
          }
        },

        /**
         * load history
         * @param callback
         */
          function (callback) {
          self.loadHistory(self.channel.id).done(function () {
            callback();
          });
        },

        /**
         * init socket
         * @param callback
         */
          function (callback) {
          self.initSocket();
          callback();
        }

      ], function (err, result) {
        if (err) {
          console.log('Error : ' + err);
        }
      });
    });
  },
  getUniqueMember: function (array) {
    var u = {}, uArray = [];
    for (var i = array.length - 1; i >= 0; i--) {
      if (u.hasOwnProperty(array[i].id)) {
        continue;
      }
      uArray.push(array[i]);
      u[array[i].id] = 1;
    }
    ;
    return uArray;
  },

  initSocket: function () {
    var self = this;
    if ( !this.$.globals.values.socket ){
      self.$.connectingDialog.open();
      this.$.globals.values.socket = io('http://' + hostname, {path: '/im/socket.io'}).connect();
    }
    self.socket = this.$.globals.values.socket;
    self.socket.removeAllListeners(); 
    self.socket.on('connect', function () {
      self.$.connectingDialog.close();
      self.socket.emit('init', {
        userId: self.currentUser.id,
        channelId: self.channel.id
      });
    });

    self.socket.on('send:message', function (message) {
      if (message.channelId !== self.channel.id) {
        self.unread[message.channelId] = self.unread[message.channelId] || [];
        self.unread[message.channelId].push(message.text);
        self.showNotification(self.userIdTeamMemberMap[message.userId].realname, 
                              message.text);
        return;
      }
      if (!document.hasFocus()) {
        self.showNotification(self.userIdTeamMemberMap[message.userId].realname, 
                              message.text);
      } 
      if (self.messages.length > 0) {
        message.hideMemberElement =
          self.isHideMemberElement(self.messages[self.messages.length - 1], message);
      }
      if (self.$.history.scrollTop + self.$.history.clientHeight === self.$.history.scrollHeight) {
        message.disableReadyEvent = false;
        message.disableLoadedEvent = false;
      } else {
        self.comingMessage = {
          userId: message.userId,
          text: message.text
        }
        message.disableReadyEvent = true;
        message.disableLoadedEvent = true;
        self.$.comingMessageToast.show();
      }
      self.messages.push(message);
      self.$.messageInput.update();


    });

    self.socket.on('user:join', function (data) {
      if (data.channelId !== self.channel.id) {
        // other channel message
        return;
      }
      // do some other things
    });

    self.socket.on('user:left', function (data) {
      if (data.channelId !== self.channel.id) {
        // other channel message
        return;
      }
      self.messages.push({
        text: 'User ' + data.userId + ' has left.'
      });
    });
    self.socket.on('disconnect', function () {
      self.$.connectingDialog.open();
      self.connectinStatus = "disconnected.";
    });

    self.socket.on('reconnecting', function (number) {
      self.$.connectingDialog.open();
      self.connectinStatus = "reconnecting... (" + number + ")";
    });
    self.socket.on('reconnecting_failed', function () {
      self.$.connectingDialog.open();
      self.connectinStatus = "reconnecting failed.";
    });
    self.socket.on('reconnect', function () {
      self.$.connectingDialog.open();
      self.connectinStatus = "connected";
    });
  },

  showTeamMemberDialog: function (event, detail, target) {
    target.querySelector('paper-dialog') && target.querySelector('paper-dialog').open();
  },

  showSingleTeamMemberDialog: function (event, detail, target) {
    var self = this;
    $.get('/platform/teams/' + self.channel.teamId + '/users').done(function (users) {
      self.teamMembers = users;
    }).done(function () {
      target.querySelector('paper-dialog') && target.querySelector('paper-dialog').open();
    });
  },

  positionTeamMemberDialog: function (event, detail, target) {
    target.dimensions.position = {v: 'top', h: 'left'};

    var rect = target.parentElement.getBoundingClientRect();
    target.style.top = '' + rect.top + 'px';
    target.style.left = '' + (rect.left - 250 ) + 'px';
  },

  talkDirect : function(event, detail, target) {
    target.parentElement&&target.parentElement.close();
    document.querySelector('app-router').go('/' + this.pluginName + '/channels/@' + target.templateInstance.model.u.realname);
  },

  isHideMemberElement: function (lastMessage, newMessage) {
    if (!lastMessage || !newMessage) {
      return false;
    }
    var lastUserId = lastMessage.UserId;
    if (!lastUserId) {
      lastUserId = lastMessage.userId;
    }
    var newUserId = newMessage.UserId;
    if (!newUserId) {
      newUserId = newMessage.userId;
    }
    if (!lastMessage || !lastUserId || !newUserId || !newMessage.updatedAt || !lastMessage.updatedAt) {
      return false;
    }
    if (lastUserId === newUserId &&
      new Date(newMessage.updatedAt).getTime() - new Date(lastMessage.updatedAt).getTime() < 60 * 1000) {
      return true;
    }
    return false;
  },
  historyLimit: 10,
  noMoreHistory: false,

  reachedTop: function (event) {
    if (this.noMoreHistory) {
      return;
    }
    if (this.messages.length < 1) {
      return;
    }
    if (this.messages[0].id == null) {
      return;
    }
    var self = this;
    return $.get(serverUrl + '/api/channels/' + self.channel.id +
    '/messages?beforeId=' + this.messages[0].id +
    '&limit=' + this.historyLimit).done(function (messages) {
      self.historyOffset += self.historyLimit;
      if (messages.length < self.historyLimit) {
        self.noMoreHistory = true;
      }
      var temp = [];
      var lastMessage = null;
      messages.forEach(function (message) {
        temp.push({
          id: message.id,
          userId: message.UserId,
          text: message.message,
          updatedAt: message.updatedAt,
          disableLoadedEvent: true,
          disableReadyEvent: true,
          hideMemberElement: self.isHideMemberElement(lastMessage, message)
        });
        lastMessage = message;
      });
      self.messages = temp.concat(self.messages);

    });
  },

  loadHistory: function (roomId) {
    var self = this;

    return $.get(serverUrl + '/api/channels/' + self.channel.id + '/messages?limit=30').done(function (messages) {
      var temp = [];
      var lastMessage = null;
      messages.forEach(function (message) {
        temp.push({
          id: message.id,
          userId: message.UserId,
          text: message.message,
          updatedAt: message.updatedAt,
          hideMemberElement: self.isHideMemberElement(lastMessage, message)
        });
        lastMessage = message;
      });
      self.messages = temp.concat(self.messages);
      delete self.unread[self.channel.id];

      self.scrollToBottom(100);
    }).done(function () {
      setTimeout(function () {
        self.$.infiniteScroll.startObserve();
      }, 1000);
    });
  },

  goToDefaultChannel: function () {
    var querySelector = this.$.groupChannel.querySelector('paper-item');
    if (querySelector) {
      querySelector.click()
    }
  },

  goToIndex: function () {
    document.querySelector('app-router').go('/dashboard');
  },

  handleChannelSelect: function (event, detail, target) {
    // exit current room
    var self = this;
    var name = target.templateInstance.model.g.name;
    if (!name) {
      name = target.templateInstance.model.g.realname;
    }
    var channelName = self.channelName;
    if (channelName.indexOf('@') === 0) {
      channelName = channelName.substr(1);
    }
    if (name === channelName) {
      return;
    }

    var hash = target.attributes['hash'].value;
    document.querySelector('app-router').go('/' + this.pluginName + '/channels/' + hash);

  },
  keyDown: function (event, detail, target) {
    var history = this.$.history;
    target.atBottom = history.scrollTop == history.scrollHeight - history.clientHeight;
  },
  inputChanging: function (event, detail, target) {
    var history = this.$.history;
    // if already bottom
    if (target.atBottom) {
      history.scrollTop = history.scrollHeight;
    }
  },
  scrollToBottom: function (delay) {
    var self = this;
    setTimeout(function () {
      self.$.history.scrollTop = self.$.history.scrollHeight;
    }, delay);
  },
  sendMessage: function () {
    var self = this;
    var uuid = this.guid();
    // add the message to our model locally
    this.messages.push({
      userId: self.currentUser.id,
      text: self.message,
      guid: uuid,
      messageStatus: 'unsend',
      hideMemberElement: true
    });
    this.scrollToBottom(100);
    this.socket.emit('send:message', {
      message: self.message,
      channelId: self.channel.id,
      guid: uuid
    }, function (message) {
      for (var i = self.messages.length - 1; i >= 0; i--) {
        if (self.messages[i].guid === message.guid) {
          self.messages[i] = message;
          if (i - 1 >= 0) {
            self.messages[i].hideMemberElement =
              self.isHideMemberElement(self.messages[i - 1], message);
          }
          break;
        }
      }
    });
    this.message = '';
    this.$.messageInput.update();

  },
  guid: function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  messageReady: function (event) {
    this.scrollToBottom(100);
  },

  messageLoaded: function (event) {
    this.scrollToBottom(100);
  },
  onClickInfomation: function () {
    this.$.informationDialog.open();
  },
  showNotification: function (userName, content) {
    if (!Notification){
      return;
    }
    var notification = new Notification("New Message from "+ userName, {
        body: content
    });
    setTimeout(function(){
      notification.close();
    }, 3000);

  },

  roomId: '',
  codeSnippetExample: "```c++\nint main(){\n    printf(\"helloworld\");\n    return 0;\n}\n```"
});

