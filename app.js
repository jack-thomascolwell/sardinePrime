'use strict';

require('dotenv').config();

const Bcrypt = require('bcrypt');
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const fs = require('fs');
const config = require('./config');

const start = async function() {

  await (new Promise((resolve, reject) => {
    fs.writeFile(config.gcloud.jsonPath, config.gcloud.jsonAuth, {}, (err) => {
      if (err) reject(err)
      else resolve()
    })
  }));

  const {
    Storage
  } = require('@google-cloud/storage');
  const storage = new Storage();

  const server = Hapi.server({
    port: config.server.port
  });

  // PLUGINS
  await server.register(require('@hapi/cookie'));
  await server.register(require('@hapi/vision'));
  await server.register(require('@hapi/inert'));

  // DB
  console.log("Connecting to mongodb")
  await server.register({
    plugin: require('hapi-mongodb'),
    options: {
      url: config.mongodb.url,
      settings: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      },
      decorate: true
    }
  });
  console.log("Connected to mongodb")

  // AUTH
  server.auth.strategy('session', 'cookie', {
    cookie: {
      name: config.auth.cookieName,
      password: config.auth.cookiePass,
      isSecure: true
    },
    redirectTo: '/admin',
    validateFunc: async (request, session) => {
      const account = await request.mongo.db.collection('users').findOne({
        _id: new request.mongo.ObjectId(session._id)
      });

      if (!account) return {
        valid: false
      };

      return {
        valid: true,
        credentials: account
      };
    }
  });

  server.auth.default('session');

  // VIEWS
  server.views({
    engines: {
      html: require('handlebars')
    },
    relativeTo: __dirname,
    path: 'views',
    layoutPath: 'views/layouts',
    helpersPath: 'views/helpers',
    partialsPath: 'views/partials',
    layout: 'layout'
  });

  // STATIC
  server.route({
    method: 'GET',
    path: '/public/{param*}',
    handler: {
      directory: {
        path: 'public',
        redirectToSlash: true
      }
    },
    options: {
      auth: false
    }
  });

  // ROUTES
  server.route(require('./routes/events.js'));
  server.route(require('./routes/menu.js'));
  server.route(require('./routes/users.js'));

  // ROUTES
  server.route({
    method: 'GET',
    path: '/',
    handler: async function(request, h) {
      let events = await request.mongo.db.collection('events').find({}).sort({
        date: -1,
        _id: -1
      }).toArray();
      const menu = await request.mongo.db.collection('menu').find({}).sort({
        name: 1,
        _id: -1
      }).toArray();

      const menuSections = {
        food: [],
        drinks: [],
      };
      for (const item of menu) {
        if (item.type === 'food') menuSections['food'].push(item);
        else menuSections['drinks'].push(item);
      }
      /*let featuredEvents = [];
      for (let i=0; i<Math.min(3, events.length); i++) {
        events[i].featured = true;
        featuredEvents.push(events[i]);
      }*/
      return h.view('index', {
        //featuredEvents: featuredEvents,
        events: events,
        menuSections: menuSections,
        landing: true,
      });
    },
    options: {
      auth: false
    }
  });

  await server.start();
  console.log('server running at: ' + server.info.uri);
};

start();
