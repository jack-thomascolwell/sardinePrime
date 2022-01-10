'use strict';

require('dotenv').config();

const Bcrypt = require('bcrypt');
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const fs = require('fs');
const cron = require('node-cron');
const config = require('./config');
const moment = require('moment-timezone');

const {
  deleteFile
} = require('./files');

//Date() fix
for (let i = 0; i < 10; i++) new Date();

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
    port: config.server.port,
    state: {
      isSameSite: 'Lax'
    }
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
      const today = new Date(Date.now());
      today.setHours(0);
      today.setMinutes(0);
      today.setSeconds(0);
      today.setMilliseconds(0);
      let events = await request.mongo.db.collection('events').find({
        date: {
          $gte: today
        }
      }).sort({
        date: 1,
        _id: -1
      }).toArray();
      const menu = await request.mongo.db.collection('menu').find({}).sort({
        name: 1,
        _id: -1
      }).toArray();

      const menuSections = {};
      for (const item of menu) {
        const type = item.type.toLowerCase().trim();
        if (!menuSections[type]) menuSections[type] = [];
        menuSections[type].push(item);
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

  // DB Cleanup
  cron.schedule('1 0 * * *', async function() {
    const today = moment().startOf('day').utc(true).toDate();
    console.log(`Starting old event cleanup`);
    const oldEvents = await server.mongo.db.collection('events').find({
      date: {
        $lt: today
      }
    }, {
      projection: {
        _id: 1
      }
    }).toArray();
    for (const oldEvent of oldEvents) {
      await deleteFile(`events/${oldEvent._id}/image`);

      const status = await server.mongo.db.collection('events').deleteOne({
        _id: oldEvent._id
      });
      console.log(`Deleted old event ${oldEvent._id} with result ${status.acknowledged}\n`);
    }
    console.log(`Finished old event cleanup (deleted ${oldEvents.length} events)`);

  });

  await server.start();
  console.log('server running at: ' + server.info.uri);
};

start();
