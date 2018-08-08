var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('https');

var index = require('./routes/index');
var users = require('./routes/users');

var firebase      = require('firebase');
var firebaseConfig = {
    apiKey: "AIzaSyC7WLrXwGPXGO_lGnz3YsAzU8YB04IF6jc",
    authDomain: "acua-a3c6b.firebaseapp.com",
    databaseURL: "https://acua-a3c6b.firebaseio.com",
    projectId: "acua-a3c6b",
    storageBucket: "acua-a3c6b.appspot.com",
    messagingSenderId: "173602554771"
};
firebase.initializeApp(firebaseConfig);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function Acua_Cloud() {

  this.scheduleJob = () => {
    
    setInterval(function() {
        http.get('https://acua-node.herokuapp.com/');
    },300000);

    setInterval(function(){
        doCheck24Reminder();

        doSendRatingServiceMessage();
    }, 60000);
    
    doTrackOrder();
  }

  function doTrackOrder() {
    var query = firebase.database().ref('Orders').orderByChild('serviceStatus').equalTo('COMPLETED');
    query.on('child_added', function(snapshot) {
      if (snapshot.val() != null) {
        var orderID = snapshot.key;
        var serviceStatus = snapshot.val().serviceStatus;
        var isRateReminded = snapshot.val().isRateReminded!=null?snapshot.val().isRateReminded:false;
        var date = new Date();
        var currentTime = date.getTime();
        if (serviceStatus == "COMPLETED" && isRateReminded==false){
          firebase.database().ref('Orders').child(orderID).child('completedAt').set(currentTime);
        }
      }
    });
  }

  function doCheck24Reminder() {
    var date = new Date();
    var currentTime = date.getTime();
    var query = firebase.database().ref('Orders').orderByChild('is24reminded').equalTo(false);
    query.once('value', function(snapshot){
      if(snapshot.val() != null) {
        var pushTokens = new Array();
        snapshot.forEach(function(obj){
          var customerId = obj.val().customerId;
          var customerPushToken = obj.val().customerPushToken;
          var beginAt = obj.val().beginAt;
          var prevAt = beginAt - 86400000; // 24hr
          var nextAt = beginAt - 86000000; // 23.8
          if (prevAt <= currentTime && currentTime < nextAt && customerPushToken!=null) {
            pushTokens.push(customerPushToken);

            firebase.database().ref('Orders').child(obj.key).child('is24reminded').set(true);
            var notificationRef = firebase.database().ref('Notifications').child(customerId).push();
            var notificationKey = notificationRef.key; 
            var notification = {
              'idx': notificationKey,
              'createdAt': currentTime,
              'isRead' : false,
              'title' : 'Reminder',
              'message' : 'The 24-hour countdown to your acuar experience has begun' 
            };
            notificationRef.set(notification, function(error){
              if (error) {
                  console.log('notification : ', error);
              }
            });
          }

          if (pushTokens.length > 0) {
            var message = { 
              app_id: "1f9e701b-7709-40e6-a1b6-7dff0ee29b42",
              contents: {"en": "The 24-hour countdown to your acuar experience has begun"},
              // included_segments: ["Active Users"],
              include_player_ids: pushTokens,
            };
            
            sendNotification(message);

          }
        });
      }
    });
  }

  function doSendRatingServiceMessage() {
    var RATING_DELAY_DURATION = process.env.RATING_DELAY_DURATION || 86400000
    var query = firebase.database().ref('Orders').orderByChild('serviceStatus').equalTo('COMPLETED');
    query.once('value', snapshot => {
      snapshot.forEach(function(childSnapshot) {
        var childKey = childSnapshot.key;
        var childData = childSnapshot.val();
        
        var orderID = childKey;
        var customerId = childData.customerId;
        var customerPushToken = childData.customerPushToken;
        var serviceStatus = childData.serviceStatus;
        var isRateReminded = childData.isRateReminded!=null?childData.isRateReminded:false;
        var date = new Date();
        var currentTime = date.getTime();
        var completedAt = childData.completedAt || currentTime;

        var delayedTime = (currentTime - completedAt);

        if (serviceStatus == "COMPLETED" && isRateReminded==false && delayedTime >= RATING_DELAY_DURATION){
          firebase.database().ref('Orders').child(orderID).child('isRateReminded').set(true);
          var notificationRef = firebase.database().ref('Notifications').child(customerId).push();
          var notificationKey = notificationRef.key; 
          var notification = {
            'idx': notificationKey,
            'createdAt': currentTime,
            'isRead' : false,
            'title' : 'Please Rate our Service',
            'message' : 'Please rate our service for your experience.' 
          };
          notificationRef.set(notification, function(error){
            if (error) {
                console.log('notification : ', error);
            }
          });

          if (customerPushToken!=null) {
            var message = { 
              app_id: "1f9e701b-7709-40e6-a1b6-7dff0ee29b42",
              contents: {"en": "Please Rate our Service"},
              include_player_ids: [customerPushToken],
            };
            
            sendNotification(message);
          }
        }

      });
    })
    
  }

  this.start = () => {
    var self = this;
    self.scheduleJob();
  };

  var sendNotification = function(data) {
    var headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": "Basic ZWUwOGU1NjQtOTQ4NS00MDkwLThkYjEtNjhlZTg1OWZkNTIz"
    };
    
    var options = {
      host: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: headers
    };
    
    var https = require('https');
    var req = https.request(options, function(res) {  
      res.on('data', function(data) {
        console.log("Response:");
        console.log(JSON.parse(data));
      });
    });
    
    req.on('error', function(e) {
      console.log("ERROR:");
      console.log(e);
    });
    
    req.write(JSON.stringify(data));
    req.end();
  };

};

Acua_Cloud.startInstance = () => {
  var acua_cloud = new Acua_Cloud();
  acua_cloud.start();
  return acua_cloud;
};

Acua_Cloud.startInstance();

module.exports = app;