(function () {
  var hostname = window.location.hostname + ':' + window.location.port;
  var serverUrl = 'http://' + hostname + '/im';
  var defaultChannel = 'default';
  var _self;

  Polymer({
    boxTapped: function () {
      this.$.textInput.focus();
    },

    states: {
      talk: 'talk',
      home: 'home',
      search: 'search',
      searching: 'searching'
    },

    connectinStatus: "connecting",

    /**
     * key : userId
     * value : the channel talk to this user
     */
    userIdTeamMemberChannelMap: {},

    pluginName: 'instantmessage',

    users: [], // the users in this room

    ready: function () {
      var self = this;
      if (!Notification) {
        alert('Please use a modern version of Chrome');
        return;
      }

      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
      window.addEventListener('hashchange', function (event) {
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
          //self.sendMessage();
          event.preventDefault();
          return;
        }
      };
      window.onkeydown = function (event) {
        self.$.imHistory.stayBottom();
      };

      this.addEventListener('channel-select', function (event) {
        self.channel = event.detail;
        self.state = self.states.talk;
        history.pushState(null, null, '#' + '/' + self.pluginName + '/channels/' + self.channel.hash);
        // load history
        self.$.imHistory.init();

      });

      this.addEventListener('channel-default', function (event) {
        self.channel = undefined;
        self.state = self.states.home;
        history.pushState(null, null, '#' + '/' + self.pluginName + '/channels/' + defaultChannel);
      });

      self.imGlobals = self.$.globals.values.im = self.$.globals.values.im || {};
      self.imGlobals.serverUrl = serverUrl;
      self.imGlobals.pluginName = this.pluginName;

      self.state = self.states.home;
    },

    /**
     * Only in domReady the userId is filled
     */
    domReady: function () {
      _self = this;
      async.waterfall([
        _initCurrentUser.bind(_self),
        _initSocketIO.bind(_self),

        function (callback) {
          _self.$.imChannels.init().done(function (res) {
            _initSocket.call(_self);
            _initXSelect.call(_self);
            callback();
          });
        }
      ], function (err, result) {
        if (err) {
          console.log('Status : ' + err);
        }
      });

    },

    observe: {
      '$.xSelect.searchText': 'initXSelect',
      '$.xSelect.isShowMenu': 'initXSelect'
    },

    handleXElementSelect: function (event) {
      var self = this;
      self.$.xSelect.hideMenu();
      self.selectedChannels = [];
      var ele = event.detail;
      if (ele.event) {
        /**
         * Search event
         */
        if (ele.event === "search-message-this-channel") {
          self.openSearch();
          self.$.imSearch.searchMessageSingleChannel(event.detail.keyword, self.channel);
        } else if (ele.event === "search-message-all-channel") {
          self.openSearch();
          self.$.imSearch.searchMessageAllChannel(event.detail.keyword);
        }

      } else {
        self.$.imChannels.goToChannel(event.detail);
      }
    },

    initXSelect: function (oldV, newV) {
      _initXSelect.call(this);
    },

    /**
     * These lines should handle in im-search, listen to the global state
     */
    openSearch: function () {
      if (this.state !== this.states.search) {
        this.state = this.states.search;
        this.$.imSearch.initSearch(this.state, serverUrl)
      }
    },

    closeSearch: function () {
      if (this.state === this.states.search) {
        this.state = this.$.imSearch.getRestoreState();
      }
    },

    computed: {
      newPrivateChannelUsersInvalid: 'newPrivateChannel.users.length < 2 || $.privateChannelNameInput.isInvalid || newPrivateChannel.name.length === 0'
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
          publicChannels: self.$.imChannels.publicChannels,
          privateChannels: self.$.imChannels.privateChannels,
          teamMemberChannels: self.$.imChannels.teamMemberChannels
        }, function (onlineList) {
          self.$.globals.values.im.onlineList = onlineList;
        });
      });

      this.socket.on('message:send', function (message) {
        self.$.imChannels.receiveMessage(message);
        if (message.channelId === self.$.imChannels.channel.id) {
          self.$.imHistory.receiveMyMessage(message);
        }
      });

      this.socket.on('channel:created', function (channel) {
        self.$.imChannels.init();
      });

      this.socket.on('channel:deleted', function (event) {
        var channel = event.channel;
        console.log('admin delete:' + channel.id);
        if (self.channel.id === channel.id) {
          self.channelName = defaultChannel;
          delete self.imGlobals.currentChannel;
          history.pushState(null, null, '#' + '/' + self.pluginName + '/channels/' + defaultChannel);
          self.$.imChannels.init();
        } else {
          self.$.imChannels.init();
        }

      });

      this.socket.on('user:dead', function (data) {
        self.socket.emit('user:alive', {});
      });

      this.socket.on('user:join', function (data) {
        if (data.channelId === 'default') {
          self.$.globals.values.im.onlineList = self.$.globals.values.im.onlineList || {};
          self.$.globals.values.im.onlineList[data.userId] = 1;
          return;
        }
        if (data.channelId !== self.channel.id) {
          // other channel message
          return;
        }
        // do some other things
      });

      this.socket.on('user:left', function (data) {
        if (data.channelId === 'default' && self.$.globals.values.im.onlineList) {
          delete self.$.globals.values.im.onlineList[data.userId];
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

    sendMessage: function () {
      var self = _self;
      if (self.message === undefined) {
        return;
      }
      if (self.message.trim() === '') {
        return;
      }
      var uuid = _guid.call(self);
      var msg = {
        userId: self.currentUser.id,
        channelId: self.channel.id,
        text: self.message,
        guid: uuid,
        messageStatus: 'unsend',
        hideMemberElement: true,
        displayPreview: 'previewHidden'
      };

      self.$.imHistory.sendMessage(msg);
      self.$.messageInput.clearText();

      self.socket.emit('message:send', msg, function (message) {
        self.$.imHistory.confirmSended(message);
        self.$.imChannels.confirmSended(message);
      });
      self.message = '';
    }
    ,


    handleMessageSeen: function (event) {
      var self = this;
      var channel = event.detail.channel;
      var message = event.detail.message;
      this.socket.emit('message:seen',
        {userId: self.currentUser.id, messageId: message.id, channelId: channel.id});
    },

    /**
     * I create channel as the owner
     * @param event
     */
    handleChannelCreated: function (event) {
      var self = this;
      var channel = event.detail.channel;
      _initXSelect.call(self);

      self.socket.emit('channel:created', {
        channel: event.detail.channel,
        users: event.detail.users,
        userId: event.detail.userId
      }, function () {

      });
    },

    /**
     * Remove the channel as the owner
     * @param event
     */
    handleChannelDeleted: function (event) {
      var self = this;
      var channel = event.detail.channel;
      _initXSelect.call(self);
      self.socket.emit('channel:deleted', {
        channel: event.detail.channel,
        users: event.detail.users,
        userId: event.detail.userId
      }, function () {

      });
    },

    /**
     * Just quit the channel
     * @param event
     */
    handleChannelUserLeft : function(event) {
      var self = this;
      var channel = event.detail.channel;
      var userId = event.detail.userId;
      _initXSelect.call(self);
    },

    togglePanel: function () {
      this.$.drawerPanel.togglePanel();
    },

    toggleSearch : function() {
      this.state = this.states.searching;
    }


  });

  function _guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function _initCurrentUser(callback) {
    var self = this;
    var currentUser = self.$.globals.values.currentUser;
    if (currentUser) {
      self.currentUser = currentUser;
      callback();
    } else {
      callback('not login');
      return;
    }
  }

  function _initSocketIO(callback) {
    var self = this;
    $.getScript(serverUrl + '/socket.io/socket.io.js').done(function () {
      callback();
    }).fail(function () {
      self.connectinStatus = "Cannot connect to server. Please refresh.";
      callback(self.connectinStatus);
    });
  }

  function _initSocket(callback) {
    var self = this;
    self.initSocket();
    callback && callback(null);
  }

  function _initXSelect(callback) {
    var self = this;
    this.fields = [
      {
        "name": "Messages",
        "data": [
          {
            "name": "Search " + self.$.xSelect.searchText + " all channels",
            "event": "search-message-all-channel",
            "keyword": self.$.xSelect.searchText
          }],
        "nameKey": "name"
      }
      ,
      {
        "name": "Group Channels",
        "data": self.$.imChannels.publicChannels,
        "nameKey": "name"
      }
      ,
      {
        "name": "Private Channels",
        "data": self.$.imChannels.privateChannels,
        "nameKey": "name"
      }
      ,
      {
        "name": "Direct Message",
        "data": self.$.imChannels.teamMemberChannels,
        "nameKey": "name",
        "icon": "avatar"
      }
    ];
    if (self.channel) {
      this.fields[0].data.unshift({
        "name": "Search " + self.$.xSelect.searchText + " in this channel",
        "event": "search-message-this-channel",
        "keyword": self.$.xSelect.searchText
      });
    }

    callback && callback();
  }

})();
