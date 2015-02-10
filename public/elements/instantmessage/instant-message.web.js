var hostname = window.location.hostname + ':' + window.location.port;
var serverUrl = 'http://' + hostname + '/im';
var defaultChannel = 'default';

var validateTimeout = undefined;

Polymer({
  boxTapped: function () {
    this.$.textInput.focus();
  },
  messages: [],
  connectinStatus: "connecting",

  /**
   * from platform, get all teams the current user belongs to
   */
  publicChannels: [],

  /**
   * unique
   * all the team members without duplication
   */
  teamMemberChannels: [],

  /**
   * private groups
   */
  privateChannels: [],

  /**
   * @key : teamId
   * @value: array, all the users in this team
   */
  teamMemberChannelMap: {},


  /**
   * key : userId
   * value : the channel talk to this user
   */
  userIdTeamMemberChannelMap: {},

  /**
   * key : channelId
   * value : (latest)MessageId
   */
  latestChannelMessage: {},

  memberDialogStyle: {
    width: '300px'
  },

  newPrivateChannel: {
    init: function () {
      this.name = '';
      this.users = [];
      this.teams = [];
    },

    name: '',
    users: [],
    teams: []
  },

  pluginName: 'instantmessage',
  unread: {},
  users: [], // the users in this room
  newMessage: false,

  ready: function () {
    this.$.imHistory.scrollToBottom(100);
    var self = this;
    if (!Notification) {
      alert('Please use a modern version of Chrome');
      return;
    }

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    window.addEventListener('hashchange', function(){
      window.onkeypress = null;
    });

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
      if (!self.$.addPrivateChannelDialog.opened) {
        self.$.textInput.focus();
      }
    };

    this.addEventListener('channel-select', function(event){
      var channel = event.detail;
      self.router.go('/' + self.pluginName + '/channels/' + channel.hash);
    });
    
    self.imGlobals = self.$.globals.values.im = self.$.globals.values.im || {};
  },

  /**
   * Only in domReady the userId is filled
   */
  domReady: function () {
    this.router = document.querySelector('app-router');
    var self = this;


    async.waterfall([

      /**
       * get current user, access platform or get it from header
       * @param callback
       */
        function (callback) {
        $.get('/platform/loggedOnUser').fail(function () {
          self.router.go('/');
          callback('not login');
          return;
        }).done(function (user) {
          self.currentUser = user;
          callback();
        });
      },


      /**
       * 1.1 get all teams that login user has
       */
        function (callback) {
        $.get('/platform/users/' + self.currentUser.id + '/teams')
          .done(function (teams) {
            self.publicChannels = [];
            teams.forEach(function(team) {
              self.publicChannels.push({
                id : ''+team.id,
                name: ''+team.name,
                hash: ''+team.name,
                userChannels:[]
              });
            });
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
       * choose one channel the user to go, if no one can be decided, show a dialog and go to error
       * @param callback
       */
        function (callback) {
        if (self.publicChannels.length === 0) {
          self.$.noGroupDlg.open();
          callback('no groups found for current user');
          return;
        } else if (self.channelName === defaultChannel) {
          if (self.imGlobals.currentChannel) {
            self.router.go('/' + self.pluginName + '/channels/' + self.imGlobals.currentChannel.name);
          } else {
            // by default use appGlobal
            self.channelName = self.publicChannels[0].name;
            self.router.go('/' + self.pluginName + '/channels/' + self.channelName);
          }
          return;
        } else {
          callback();
        }
      },

      /**
       * 1.2 get all team members for publicChannels (not mine)
       */
        function (callback) {
        var teamMemberChannels = [];
        async.each(self.publicChannels,
          function (team, cb) {
            $.get('/platform/teams/' + team.id + '/users')
              .done(function (users) {
                team.userChannels = [];
                users.forEach(function(user) {
                  if (user.id !== self.currentUser.id){
                    var channel = {
                      id: self.getTeamMemberChannelId(self.currentUser.id, user.id),
                      name: user.realname,
                      hash: '@' + user.realname,
                      isPrivate : true,
                      user : user
                    };
                    team.userChannels.push(channel);
                    teamMemberChannels.push(channel);
                  }
                });
                cb();
              });
          }, function (err) {
            if (!err) {
              self.teamMemberChannels = self.getUniqueTeamMemberChannel(teamMemberChannels);
              callback(null);
            }
          });
      },


    /**
     * 1.3 get private channels from imdb
     * get all private channel team members
     */
      self.loadPrivateChannels.bind(self),

      /**
       * get current channel, from channelName ->  self.channel
       * @param callback
       */
        function (callback) {

        var channelNameMappedId = -1;
        if ((''+self.channelName).indexOf('@') === 0) {
          var name = self.channelName.substr(1);
          self.teamMemberChannels.forEach(function (teamMemberChannel) {
            if (teamMemberChannel.name === name) {
              self.channel = teamMemberChannel;
              callback(null, self.channel);
            }
          });
        } else {
          self.publicChannels.forEach(function (publicChannel) {
            if (publicChannel.name === self.channelName) {
              self.channel = publicChannel;
              callback(null, self.channel);
            }
          });
          self.privateChannels.forEach(function (privateChannel) {
            if (privateChannel.name === self.channelName) {
              self.channel = privateChannel;
              callback(null, self.channel);
            }
          });
        }
        if (!self.channel) {
          // redirect to 403
          callback(403);
        } else {
          self.imGlobals.currentChannel = self.channel;
        }
      },
      /**
       * init socket
       * @param callback
       */
        function (channel, callback) {
        self.initSocket();
        callback(null, channel);
      },

      function (channel, callback) {
        $.get(serverUrl + '/api/channels/' + self.channel.id + '/messages/lastSeen')
          .done(function (lastSeenMessageId) {
            if (!lastSeenMessageId) {
              callback(null, channel);
              return;
            }
            self.$.imHistory.getLastSeenMessages(lastSeenMessageId.messageId).done(function () {
              callback(null, channel);
            });
          });
      },


      /**
       * load history
       * @param callback
       */
        function (channel, callback) {
        self.$.imHistory.loadHistory(self.channel.id).done(function () {
          callback();
        });
      },

      /**
       * load latest message
       */
        function (callback) {
        var channelIds = _.pluck(self.publicChannels, 'id').concat(_.pluck(self.privateChannels, 'id')).concat(_.pluck(self.teamMemberChannels, 'id'));
        $.post(serverUrl + '/api/messages/latest', {
          channelIds: channelIds
        }).done(function (res) {
          var temp = {};
          res.forEach(function (res, idx) {
            temp[res.channelId] = res.messageId;
          });
          self.latestChannelMessage = temp;
          callback();
        });
      }


    ], function (err, result) {
      self.$.forbiddenDiv.hidden = 403 !== err;
      if (err){
        console.log('Error : ' + err);
      }
    });
    this.$.informationButton.style.height = this.$.textInput.clientHeight + 'px';
  },

  computed : {
    newPrivateChannelUsersInvalid : 'newPrivateChannel.users.length < 2 || $.privateChannelNameInput.isInvalid || newPrivateChannel.name.length === 0'
  },

  getUniqueTeamMemberChannel: function (array) {
    var u = {}, uArray = [];
    for (var i = array.length - 1; i >= 0; i--) {
      if (u.hasOwnProperty(array[i].id)) {
        continue;
      }
      uArray.push(array[i]);
      u[array[i].id] = 1;
    }
    return uArray;
  },

  initSocket: function () {
    var self = this;
    if (!this.$.globals.values.socket) {
      this.$.connectingDialog.open();
      this.$.globals.values.socket = io('http://' + hostname, {path: '/im/socket.io'}).connect();
      window.onbeforeunload = function (e) {
        self.socket.emit('user:disconnect', {userId: self.currentUser.id});
        self.$.globals.values.socket.disconnect();
        self.$.globals.values.socket = null;

      }
    }
    this.socket = this.$.globals.values.socket;
    this.socket.removeAllListeners();
    this.socket.on('connect', function () {
      self.$.connectingDialog.close();
      self.socket.emit('init', {
        userId: self.currentUser.id,
        publicChannels: self.publicChannels,
        privateChannels: self.privateChannels,
        teamMemberChannels: self.teamMemberChannels,
        currentChannel: self.channel
      }, function (onlineList) {
        self.$.globals.values.onlineList = onlineList;
      });
    });

    this.socket.on('message:send', function (message) {
      self.$.imHistory.receiveMessage(message);
      self.$.messageInput.update();
    });

    this.socket.on('channel:created', function (channel) {
      (self.loadPrivateChannels.bind(self))(function(){});
    });

    this.socket.on('user:dead', function (data) {
      self.socket.emit('user:alive', {});
    });

    this.socket.on('user:join', function (data) {
      if (data.channelId === 'default') {
        self.$.globals.values.onlineList = self.$.globals.values.onlineList || {};
        self.$.globals.values.onlineList[data.userId] = 1;
        return;
      }
      if (data.channelId !== self.channel.id) {
        // other channel message
        return;
      }
      // do some other things
    });

    this.socket.on('user:left', function (data) {
      if (data.channelId === 'default' && self.$.globals.values.onlineList) {
        delete self.$.globals.values.onlineList[data.userId];
        return;
      }
      if (data.channelId !== self.channel.id) {
        // other channel message
        return;
      }
    });
    this.socket.on('disconnect', function () {
      self.$.connectingDialog.open();
      self.connectinStatus = "disconnected.";
    });

    this.socket.on('reconnecting', function (number) {
      self.$.connectingDialog.open();
      self.connectinStatus = "reconnecting... (" + number + ")";
    });
    this.socket.on('reconnecting_failed', function () {
      self.$.connectingDialog.open();
      self.connectinStatus = "reconnecting failed.";
    });
    this.socket.on('reconnect', function () {
      self.$.connectingDialog.open();
      self.connectinStatus = "connected";
    });
  }
  ,
  showAddPrivateChannelDialog: function (event, detail, target) {
    this.newPrivateChannel.users = [this.currentUser.id];
    this.$.addPrivateChannelDialog.open();
  }
  ,

  showRemovePrivateChannelDialog:function (event, detail, target) {
    this.removedPrivateChannel = target.templateInstance.model.g;
    this.$.removePrivateChannelDialog.open();
  }
  ,

  addPrivateChannel: function (event, detail, target) {
    var self = this;
    async.waterfall([
      function (cb) {
        $.get(serverUrl + '/api/channels?name=' + self.newPrivateChannel.name).done(function (channels) {
          self.$.privateChannelNameInput.isInvalid = channels.length > 0;
          if (!self.$.privateChannelNameInput.isInvalid) {
            cb();
          } else {
            cb('Private channel name duplicated');
          }
        })
      },

      function (cb) {
        self.newPrivateChannel.id = self.guid();
        $.post(serverUrl + '/api/channels', self.newPrivateChannel).done(function (channel) {
          cb(null, channel);
        }).fail(function (err) {
          if (err.status === 409) {
            // highlight the input
            cb(409)
          } else {
            cb('cannot create private channel');
          }
        })
      },

      /**
       * get the users of this channel
       * @param cb
       * @param channel
       */
        function (channel, cb) {
        $.get(serverUrl + '/api/channels/' + channel.id + '/users').done(function (users) {
          cb(null, channel, users);
        })
      },

      /**
       * notify other users he is joined in this channel
       * @param cb
       * @param channel the channel newly created
       * @param users the users in this channel
       */
        function (channel, users, cb) {
        self.socket.emit('channel:created', {
          channel: channel,
          users: users,
          userId: self.currentUser.id
        }, function () {
          cb(null, channel);
        });
      }
    ], function (err, channel) {
      if (!err) {
        self.$.addPrivateChannelDialog.close();
        self.newPrivateChannel.init();
        self.router.go('/' + self.pluginName + '/channels/' + channel.name);
      } else {
        console.log('error during creating private channel : ' + err);
      }
    });
  }
  ,

  removePrivateChannel: function (event, detail, target) {
    var self = this;
    var channelId = target.attributes.channelId.value;
    var dlg = target.parentElement;
    $.ajax({
      url: serverUrl + '/api/channels/' + channelId,
      type: 'DELETE',
      success: function(result) {
        dlg.close();
        if (self.channel.id === channelId) {
          delete self.imGlobals.currentChannel;
          self.router.go('/' + self.pluginName + '/channels/' + defaultChannel);
        } else {
          self.loadPrivateChannels(function(){});
        }
      }
    });
  }
  ,

  validatePrivateChannelName: function (oldValue, newValue) {
    var self = this;
    clearTimeout(validateTimeout);
    validateTimeout = setTimeout(function () {
      if (!newValue.match(/^[a-zA-Z]{1}.*$/g)) {
        self.$.privateChannelNameInput.isInvalid = true;
        self.newPrivateChannel.error = {
          msg : 'Name should be start with alphabets'
        };
        return;
      } else {
        self.$.privateChannelNameInput.isInvalid = false;
        self.newPrivateChannel.error = {
          msg : ''
        };
      }
      $.get(serverUrl + '/api/channels?name=' + newValue).done(function (channels) {
        console.log('called validation for ' + newValue);
        self.$.privateChannelNameInput.isInvalid = channels.length > 0;
        self.newPrivateChannel.error = {
          msg : 'Name duplicated'
        };
      });
    }, 500);
  }
  ,

  observe: {
    'newPrivateChannel.name': 'validatePrivateChannelName'
  },


  loadPrivateChannels: function (callback){
    var self = this;
    $.get(serverUrl + '/api/channels').done(
      function (channels) {
        self.privateChannels = [];
        channels.forEach(function(channel){
          self.privateChannels.push({
            id: ''+channel.id,
            name: channel.name,
            hash: channel.name,
            userChannels:[]
          });
        })
      }).done(function (channels) {
        async.each(self.privateChannels,
          function (team, cb) {
            $.get(serverUrl + '/api/channels/' + team.id + '/users')
              .done(function (users) {
                self.teamMemberChannelMap[team.id] = [];
                users.forEach(function (user) {
                  self.teamMemberChannelMap[team.id].push(user);
                  if (user.id !== self.currentUser.id) {
                    // teamMembers.push(user);
                  }
                });
                cb();
              });
          }, function (err) {
            if (!err) {
              callback();
            }
          });
      });
  },

  goToDefaultChannel: function () {
    var querySelector = this.$.groupChannel.querySelector('paper-item');
    if (querySelector) {
      querySelector.click()
    }
  }
  ,

  goToIndex: function () {
    router.go('/dashboard');
  }
  ,

  keyDown: function (event, detail, target) {
    target.atBottom = this.$.imHistory.atBottom();
  }
  ,
  inputChanging: function (event, detail, target) {
    var history = this.$.imHistory;
    this.$.informationButton.style.height = this.$.textInput.clientHeight + 'px';

    // if already bottom
    if (target.atBottom) {
      history.scrollTop = history.scrollHeight;
    }
  }
  ,

  sendMessage: function () {
    var self = this;
    var uuid = this.guid();
    var msg = {
      userId: self.currentUser.id,
      channelId: self.channel.id,
      text: self.message,
      guid: uuid,
      messageStatus: 'unsend',
      hideMemberElement: true,
      displayPreview:'previewHidden'
    };

    self.$.imHistory.sendMessage(msg);

    this.socket.emit('message:send', msg, function (message) {
      self.$.imHistory.confirmSended(message);
    });
    this.message = '';
    this.$.messageInput.update();
    this.$.informationButton.style.height = this.$.textInput.clientHeight + 'px';
  }
  ,
  guid: function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  ,

  onClickInfomation: function () {
    this.$.informationDialog.open();
  },

  getTeamMemberChannelId: function (id1, id2) {
    if (!(id1 && id2)) {
      throw 'both id1 and id2 should not be empty';
    }
    var minId = id1 < id2 ? id1 : id2;
    var maxId = id1 < id2 ? id2 : id1;
    return '' + minId + ':' + maxId;
  },

  handleMessageSeen : function(event) {
    var self = this;
    var channel = event.detail.channel;
    var message = event.detail.message;
    this.socket.emit('message:seen',
      {userId: self.currentUser.id, messageId: message.id, channelId: channel.id});
  },

  handleMessageNotify: function(event) {
    var message = event.detail;
    _showNotification.call(this, message.userId, message.text, message.channelId)
  },


  togglePanel: function() {
      this.$.drawerPanel.togglePanel();
  },

  roomId: '',
  codeSnippetExample: "```c++\nint main(){\n    printf(\"helloworld\");\n    return 0;\n}\n```"
})
;

function _showNotification(userId, content, channelId) {
  if (userId === this.currentUser.id){
    return;
  }
  var notification = new Notification("New Message from " +
  this.$.globals.values.memberCache[userId].username, {
    body: content,
    icon: this.$.globals.values.memberCache[userId].url + "?d=identicon"
  });
  var self = this;
  var directToChannel = "";
  for (var i = this.publicChannels.length - 1; i >= 0; i--) {
    if ((''+this.publicChannels[i].id) === channelId) {
      directToChannel = this.publicChannels[i].name;
    }
  }
  for (var i = this.privateChannels.length - 1; i >= 0; i--) {
    if ((this.privateChannels[i].id) === channelId) {
      directToChannel = this.privateChannels[i].name;
    }
  }
  for (var i = this.teamMemberChannels.length - 1; i >= 0; i--) {
    if (this.teamMemberChannels[i].id === channelId) {
      directToChannel = '@' + this.teamMemberChannels[i].realname;
    }
  }

  notification.onclick = function () {
    window.focus();
    if (channelId != self.channel.id) {
      document.querySelector('app-router').go('/' + self.pluginName + '/channels/' + directToChannel);
    }
  }
  setTimeout(function () {

    notification.close();
  }, 3000);
}

