var Hapi = require('hapi')
  , Joi = require('joi')
  , twilio = require('twilio');

// Create a server with a host and port
var server = new Hapi.Server(process.env.PORT || 3000);

var messageHandler = function(request, reply) {
  var twiml = new twilio.TwimlResponse();
  if (request.payload.NumMedia > 0) {
    twiml.message(function() {
      this.body('Yay!');
      this.media('http://mustachify.me/?src='+request.payload.MediaUrl0);
    });
  }
  else {
    twiml.message('Doh!');
  }
  reply(twiml.toString());
};

var schema = Joi.object().keys({
  NumMedia: Joi.number().integer().min(0),
}).unknown();

// Add the route
server.route({ method: 'POST', path: '/message', handler: messageHandler, 
  config: {
    validate: {
      payload: schema
    }
  } 
});

// Start the server
server.start();
