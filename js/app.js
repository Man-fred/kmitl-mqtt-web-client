/**
 * Copyright 2013 dc-square GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author: Christoph Schäbel
 */

var websocketclient = {
    'client': null,
	'connection': new Object,
    'lastMessageId': 1,
    'lastSubId': 1,
    'subscriptions': [],
    'messages': [],
    'connected': false,

    'getConnection': function () {
		//var connection = {};
        this.connection.host = $('#urlInput').val();
        this.connection.port = parseInt($('#portInput').val(), 10);
        this.connection.clientId = $('#clientIdInput').val();
        this.connection.username = $('#userInput').val();
        this.connection.password = $('#pwInput').val();
        this.connection.keepAlive = parseInt($('#keepAliveInput').val());
        this.connection.cleanSession = $('#cleanSessionInput').is(':checked');
        this.connection.lwTopic = $('#lwTopicInput').val();
        this.connection.lwQos = parseInt($('#lwQosInput').val());
        this.connection.lwRetain = $('#LWRInput').is(':checked');
        this.connection.lwMessage = $('#LWMInput').val();
        this.connection.ssl = $('#sslInput').is(':checked');

		//return connection;
	},

    'getSaved': function () {
		var sel = $('#urlInputSaved');
		sel.length = 0;
		var i = 0;
		var result = false;
		var savedKey = localStorage.key(i++)
		while (savedKey) {
			if (savedKey && savedKey.includes('_mqtt_') ) {
				var saved = localStorage.getItem(savedKey);
				try {
					var connection = JSON.parse(saved);
				} finally {}
				if (connection) {
					//sel[sel.length] = new Option(connection.host, connection.host);
					$("<option/>").val(connection.host).text(connection.host).appendTo("#urlInputSaved");
					result = true;
				}
			}
			savedKey = localStorage.key(i++)
		}
					//sel[sel.length] = new Option('test', 'Test');
		return result;
	},
	
    'save': function () {
		this.getConnection();
		var test = JSON.stringify(this.connection);
		localStorage.setItem('_mqtt_'+this.connection.host, JSON.stringify(this.connection));
		this.getSaved();
	},

	'loadConnect': function() {
		if (this.load()) {
			this.connect();
			websocketclient.render.show('conni');
			websocketclient.render.hide('saved');
		}
	},
	
    'load': function () {
		var connection;
		var saved = localStorage.getItem('_mqtt_'+$('#urlInputSaved').val())
		try {
			connection = JSON.parse(saved);
		} finally {}
		if (connection && connection.host) {
			$('#urlInput').val(connection.host);
			$('#portInput').val(connection.port);
			$('#clientIdInput').val(connection.clientId);
			$('#userInput').val(connection.username);
			$('#pwInput').val(connection.password);
			$('#keepAliveInput').val(connection.keepAlive);
			$('#cleanSessionInput').prop('checked', connection.cleanSession);
			$('#lwTopicInput').val(connection.lwTopic);
			$('#lwQosInput').val(connection.lwQos);
			$('#LWRInput').prop('checked', connection.lwRetain);
			$('#LWMInput').val(connection.lwMessage);
			$('#sslInput').prop('checked', connection.ssl);
			/*if (!connection.subscriptions) {
				connection.subscriptions = [];
			}*/
			this.connection = connection;
			this.render.show('conni');
			this.render.hide('saved');
			return true;
		} else {
			return false;
		}
	},

	'connect': function () {
		this.getConnection();

        this.client = new Messaging.Client(this.connection.host, this.connection.port, this.connection.clientId);
        this.client.onConnectionLost = this.onConnectionLost;
        this.client.onMessageArrived = this.onMessageArrived;

        var options = {
            timeout: 3,
            keepAliveInterval: this.connection.keepAlive,
            cleanSession: this.connection.cleanSession,
            useSSL: this.connection.ssl,
            onSuccess: this.onConnect,
            onFailure: this.onFail
        };

        if (this.connection.username.length > 0) {
            options.userName = this.connection.username;
        }
        if (this.connection.password.length > 0) {
            options.password = this.connection.password;
        }
        if (this.connection.lwTopic.length > 0) {
            var willmsg = new Messaging.Message(this.connection.lwMessage);
            willmsg.qos = this.connection.lwQos;
            willmsg.destinationName = this.connection.lwTopic;
            willmsg.retained = this.connection.lwRetain;
            options.willMessage = willmsg;
        }

        this.client.connect(options);
    },

    'onConnect': function () {
        websocketclient.connected = true;
        console.log("connected");
        var body = $('body').addClass('connected').removeClass('notconnected').removeClass('connectionbroke');

        websocketclient.render.hide('conni');
        websocketclient.render.show('publish');
        websocketclient.render.show('sub');
        websocketclient.render.show('messages');
		if (websocketclient.connection.subscriptions) {
			websocketclient.render.subscriptions();
			_.forEach(websocketclient.connection.subscriptions, function (subs) {
				websocketclient.client.subscribe(subs.topic, {qos: subs.qos, onSuccess: websocketclient.subscribeSuccess, onFailure: websocketclient.subscribeFailure,timeout: 10, invocationContext: {'Source': "new"}});
			});
		}
    },

    'onFail': function (message) {
        websocketclient.connected = false;
        console.log("error: " + message.errorMessage);
        websocketclient.render.showError('Connect failed: ' + message.errorMessage);
    },

    'onConnectionLost': function (responseObject) {
        websocketclient.connected = false;
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:" + responseObject.errorMessage);
        }
        $('body.connected').removeClass('connected').addClass('notconnected').addClass('connectionbroke');
        websocketclient.render.show('conni');
        websocketclient.render.hide('publish');
        websocketclient.render.hide('sub');
        websocketclient.render.hide('messages');

        //Cleanup messages
        websocketclient.messages = [];
        websocketclient.render.clearMessages();

        //Cleanup subscriptions
        websocketclient.render.clearSubscriptions();
    },

    'onMessageArrived': function (message) {
        var subscription = websocketclient.getSubscriptionForTopic(message.destinationName);

        var messageObj = {
            'topic': message.destinationName,
            'retained': message.retained,
            'qos': message.qos,
            'payload': message.payloadString,
            'timestamp': moment(),
            'subscriptionId': subscription.id,
            'color': websocketclient.getColorForSubscription(subscription.id)
        };

        //console.log(messageObj);
        messageObj.id = websocketclient.render.message(messageObj);
        websocketclient.messages.push(messageObj);
    },

    'disconnect': function () {
        this.client.disconnect();
    },

    'publish': function (topic, payload, qos, retain) {

        if (!websocketclient.connected) {
            websocketclient.render.showError("Not connected");
            return false;
        }

        var message = new Messaging.Message(payload);
        message.destinationName = topic;
        message.qos = qos;
        message.retained = retain;
        this.client.send(message);
    },

    'subscribe': function (topic, qosNr, color) {

        if (!websocketclient.connected) {
            websocketclient.render.showError("Not connected");
            return false;
        }

        if (topic.length < 1) {
            websocketclient.render.showError("Topic cannot be empty");
            return false;
        }
		if (this.connection.subscriptions) {
			if (_.find(this.connection.subscriptions, { 'topic': topic })) {
				websocketclient.render.showError('You are already subscribed to this topic');
				return false;
			}
		} else {
			this.connection.subscriptions = [];
		}
        this.client.subscribe(topic, {qos: qosNr, onSuccess: this.subscribeSuccess, onFailure: this.subscribeFailure,timeout: 10, invocationContext: {'Source': "new"}});
        if (color.length < 1) {
            color = '999999';
        }

        var subscription = {'topic': topic, 'qos': qosNr, 'color': color};
        subscription.id = websocketclient.render.subscription(subscription);
        this.connection.subscriptions.push(subscription);
        return true;
    },
	
	'subscribeSuccess': function(erg) {
		websocketclient.render.showSuccess('Ok: '+erg.invocationContext.Source);
		console.log(erg);
	},
	
	'subscribeFailure': function(erg) {
		console.log(erg);
	},
	
    'unsubscribe': function (id) {
        var subs = _.find(websocketclient.connection.subscriptions, {'id': id});
        this.client.unsubscribe(subs.topic);
        websocketclient.connection.subscriptions = _.filter(websocketclient.connection.subscriptions, function (item) {
            return item.id != id;
        });

        websocketclient.render.removeSubscriptionsMessages(id);
    },

    'deleteSubscription': function (id) {
        var elem = $("#sub" + id);

        if (confirm('Wirklich löschen ?')) {
            elem.remove();
            this.unsubscribe(id);
        }
    },

    'getRandomColor': function () {
        var r = (Math.round(Math.random() * 255)).toString(16);
        var g = (Math.round(Math.random() * 255)).toString(16);
        var b = (Math.round(Math.random() * 255)).toString(16);
        return r + g + b;
    },

    'getSubscriptionForTopic': function (topic) {
        var i;
        for (i = 0; i < this.connection.subscriptions.length; i++) {
            if (this.compareTopics(topic, this.connection.subscriptions[i].topic)) {
                return this.connection.subscriptions[i];
            }
        }
        return false;
    },

    'getColorForPublishTopic': function (topic) {
        var id = this.getSubscriptionForTopic(topic);
        return this.getColorForSubscription(id);
    },

    'getColorForSubscription': function (id) {
        try {
            if (!id) {
                return '99999';
            }

            var sub = _.find(this.connection.subscriptions, { 'id': id });
            if (!sub) {
                return '999999';
            } else {
                return sub.color;
            }
        } catch (e) {
            return '999999';
        }
    },

    'compareTopics': function (topic, subTopic) {
        var pattern = subTopic.replace("+", "(.+?)").replace("#", "(.*)");
        var regex = new RegExp("^" + pattern + "$");
        return regex.test(topic);
    },

    'render': {

        'showError': function (message) {
            alert(message);
        },
        'showSuccess': function (message) {
            alert(message);
        },
        'messages': function () {

            websocketclient.render.clearMessages();
            _.forEach(websocketclient.messages, function (message) {
                message.id = websocketclient.render.message(message);
            });

        },
        'message': function (message) {

            var largest = websocketclient.lastMessageId++;

            var html = '<li class="messLine messageText id="' + largest + '">' +
                '   <div class="row mess' + largest + '" style="border-left: solid 10px #' + message.color + '; ">' +
                '      <div class="small-8 columns">' +
                '         <div class="row">' +
                '            <div class="small-12 large-6 columns date">' + message.timestamp.format("YYYY-MM-DD HH:mm:ss") + '</div>' +
                '            <div class="small-12 large-6 columns topicM truncate" id="topicM' + largest + 
                '" title="' + Encoder.htmlEncode(message.topic, 0) + '">Topic: ' + Encoder.htmlEncode(message.topic) + '</div>' +
                '         </div>' +
                '      </div>' +
                '      <div class="small-4 columns">' +
                '         <div class="row">' +
                '            <div class="small-12 large-6 columns qos">Qos: ' + message.qos + '</div>' +
                '            <div class="small-12 large-6 columns retain">';
            if (message.retained) {
                html += 'Retained';
            }
            html += '        </div>' +
                '         </div>' +
                '      </div>' +
                '   </div>' +
                '   <div class="row mess' + largest + '" style="border-left: solid 10px #' + message.color + '; ">' +
                '           <div class="small-12 columns message break-words">' + Encoder.htmlEncode(message.payload) + '</div>' +
                '   </div>' +
                '</li>';
            $("#messEdit").prepend(html);
            return largest;
        },

        'subscriptions': function () {
            websocketclient.render.clearSubscriptions();
            _.forEach(websocketclient.connection.subscriptions, function (subs) {
                subs.id = websocketclient.render.subscription(subs);
            });
        },

        'subscription': function (subscription) {
            var largest = websocketclient.lastSubId++;
            $("#innerEdit").append(
                '<li class="subLine" id="sub' + largest + '">' +
                    '   <div class="row subText subs' + largest + '" style="border-left: solid 10px #' + subscription.color + '; background-color: #ffffff">' +
                    '           <div class="small-1 column right closer">' +
                    '              <a href="#" onclick="websocketclient.deleteSubscription(' + largest + '); return false;">x</a>' +
                    '           </div>' +
                    '           <div class="small-4 columns qos">Qos: ' + subscription.qos + '</div>' +
                    '           <div class="small-6 columns topic truncate" id="topic' + largest + '" title="' + Encoder.htmlEncode(subscription.topic, 0) + '">' + Encoder.htmlEncode(subscription.topic) + '</div>' +
                    '   </div>' +
                    '</li>');
            return largest;
        },

        'toggleAll': function () {
            websocketclient.render.toggle('conni');
            websocketclient.render.toggle('publish');
            websocketclient.render.toggle('messages');
            websocketclient.render.toggle('sub');
        },

        'toggle': function (name) {
            $('.' + name + 'Arrow').toggleClass("closed");
            $('.' + name + 'Top').toggleClass("closed");
            var elem = $('#' + name + 'Main');
            elem.slideToggle();
        },

        'hide': function (name) {
            $('.' + name + 'Arrow').addClass("closed");
            $('.' + name + 'Top').addClass("closed");
            var elem = $('#' + name + 'Main');
            elem.slideUp();
        },

        'show': function (name) {
            $('.' + name + 'Arrow').removeClass("closed");
            $('.' + name + 'Top').removeClass("closed");
            var elem = $('#' + name + 'Main');
            elem.slideDown();
        },

        'removeSubscriptionsMessages': function (id) {
            websocketclient.messages = _.filter(websocketclient.messages, function (item) {
                return item.subscriptionId != id;
            });
            websocketclient.render.messages();
        },

        'clearMessages': function () {
            $("#messEdit").empty();
        },

        'clearSubscriptions': function () {
            $("#innerEdit").empty();
        }
    }
};