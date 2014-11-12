var Hapi = require('hapi')
  , Joi = require('joi')
  , socketio = require('socket.io')
  , twilio = require('twilio')
  , io;

// Create a server with a host and port
var server = new Hapi.Server(process.env.PORT || 3000);

// Stream photos from loaded from Twilio when a browser loads the index page
function streamImagesToNewUser(id) {
  var client = new twilio.RestClient();
  client.messages.get({
    from: process.env.TWILIO_CALLER_ID,
    num_media: 1,
    PageSize: 100}, function(err, response) {
      if (err) {
        console.log(err);
      } else {
        response.messages.forEach(function(message) {
          if (message.num_media != '0') {
            client.messages(message.sid).media.list(function(err, response) {
              if (err) {
                console.log(err);
              } else {
                response.mediaList.forEach(function(media) {
                  if (media.contentType !== null && media.contentType.indexOf('image') >= 0) {
                    url = "https://api.twilio.com/" + media.uri.replace('.json', '');
                    console.log("Sending this image URL to the browser: " + url);
                    io.to(id).emit('new_media', url);
                  }
                });
              }
            });
          }
        });
      }
  });
}

// Handler for POST /message
var messageHandler = function(request, reply) {
  var twiml = new twilio.TwimlResponse();
  if (request.payload.NumMedia > 0) {
    twiml.message(function() {
      this.body('In a few moments, you\'ll have a sweet stash coming your way...');
    });
    twiml.message(function() {
      this.body('No stash? Try again and face the camera fully.\n\nLike your stash? Share this Twilio-powered phone number with your friends!\n\nPowered by http://twil.io');
      this.media('http://mustachify.me/?src='+request.payload.MediaUrl0);
      // update the website
      io.emit('new_media', 'http://mustachify.me/?src='+request.payload.MediaUrl0);
    });
  }
  else {
    twiml.message('Want a sweet mustache? Send me a selfie and get a stash applied by Twilio MMS: http://twilio.com/mms');
  }
  reply(twiml.toString());
};

// Schema to validate incoming Twilio requests
var twilioRequestSchema = Joi.object().keys({
  NumMedia: Joi.number().integer().min(0),
}).unknown();

// Add the route
server.route([{ 
  method: 'POST', path: '/message', handler: messageHandler, config: {
    validate: {
      payload: twilioRequestSchema
    }
  } }, {
  method: 'GET', path: '/{p*}',
    handler: {
      directory: { path: './static', listing: false, index: true }
    }
  }  
]);

// Start the server
server.start(function () {
  io = socketio.listen(server.listener);

  io.on('connection', function(socket){
    io.to(socket.id).emit('connected', 'Connected!');
    streamImagesToNewUser(socket.id);
  });

  console.log("Listening on port", process.env.PORT || 3000);
});

