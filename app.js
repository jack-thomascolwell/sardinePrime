'use strict';

const Bcrypt = require('bcrypt');
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const config = require('./config');
const saltRounds = 10;

const users = [{
  username: 'john',
  password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm', // 'secret'
}];

const start = async function() {

  const server = Hapi.server({
    port: config.server.port
  });

  // PLUGINS
  await server.register(require('@hapi/cookie'));
  await server.register(require('@hapi/vision'));
  await server.register(require('@hapi/inert'));

  // STATIC
  server.route({
    method: 'GET',
    path: '/public/{param*}',
    handler: {
      directory: {
        path: 'public',
        redirectToSlash: true,
        index: false
      }
    },
    options: {
      auth: false
    }
  });

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
    redirectTo: '/',
    validateFunc: async (request, session) => {
      const account = await request.mongo.db.collection('users').findOne({
        _id: new request.mongo.ObjectId(session._id)
      });
      console.log([account, session._id])

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

  // ROUTES
  server.route(require('./routes/events.js'));
  server.route(require('./routes/menu.js'));
  // ROUTES
  server.route([{
    method: 'GET',
    path: '/',
    handler: async function(request, h) {
      let events = await request.mongo.db.collection('events').find({}).sort({
        date: 1,
        _id: -1
      }).toArray();
      const menu = await request.mongo.db.collection('menu').find({}).sort({
        name: 1,
        _id: -1
      }).toArray();
      let featuredEvents = [];
      for (let i=0; i<Math.min(3, events.length); i++) {
        events[i].featured = true;
        featuredEvents.push(events[i]);
      }
      return h.view('index', {
        featuredEvents: featuredEvents,
        events: events,
        menu: menu
      });
    },
    options: {
      auth: false
    }
  }, {
    method: 'GET',
    path: '/admin',
    handler: async function(request, h) {
      if (request.auth.isAuthenticated) return h.redirect('/admin/events');
      return h.view('login', {
        admin: true,
        loggingIn: true,
      });
    },
    options: {
      auth: {
        mode: 'try'
      }
    }
  }, {
    method: 'POST',
    path: '/admin',
    handler: async (request, h) => {
      if (request.auth.isAuthenticated) {
        console.log("already logged in");
        return h.redirect('/admin/events');
      }

      let payload = request.payload;
      if (payload.username) payload.username = payload.username.toLowerCase();

      const schema = Joi.object({
        _id: Joi.any().forbidden(),
        username: Joi.string().required(),
        password: Joi.string().required(),
      });

      const {
        error,
        value
      } = schema.validate(payload);

      if (error) return h.view('login', {
        username: payload.username,
        error: error,
        admin: true,
        loggingIn: true,
      });

      const {
        username,
        password
      } = payload;

      const account = await request.mongo.db.collection('users').findOne({
        username: username
      });

      if (!account || !(await Bcrypt.compare(password, account.password))) {
        return h.view('login', {
          username: username,
          error: 'Incorrect username or password',
          admin: true,
          loggingIn: true,
        });
      }

      request.cookieAuth.set({
        _id: account._id
      });
      return h.redirect('/admin/events');
    },
    options: {
      auth: {
        mode: 'try'
      }
    }
  }, {
    method: 'GET',
    path: '/register',
    handler: async (request, h) => {
      if (request.auth.isAuthenticated)
        return h.redirect('/admin/events');
      return h.view('register', {
        admin: true,
        loggingIn: true,
      });
    },
    options: {
      auth: {
        mode: 'try'
      }
    }
  }, {
    method: 'POST',
    path: '/register',
    handler: async (request, h) => {
      if (request.auth.isAuthenticated)
        return h.redirect('/admin/events');

      let payload = request.payload;

      if (payload.username) payload.username = payload.username.toLowerCase();

      const schema = Joi.object({
        _id: Joi.any().forbidden(),
        username: Joi.string(),
        password: Joi.string(),
        repeat_password: Joi.ref('password'),
        admin: Joi.any().forbidden()
      });
      let {
        error,
        value
      } = schema.validate(payload);

      if (error) return h.view('register', {
        error: error,
        username: username,
        admin: true,
        loggingIn: true,
      });

      const existingUsers = await request.mongo.db.collection('users').find({
        username: payload.username,
      }).toArray();

      if (existingUsers.length > 0) error = 'Username not available';

      if (error) return h.view('register', {
        error: error,
        username: username,
        admin: true,
        loggingIn: true,
      });

      const newUser = {
        username: payload.username,
        password: await Bcrypt.hash(payload.password, saltRounds),
        admin: false
      }

      const status = await request.mongo.db.collection('users').insertOne(newUser);
      if (status.acknowledged) return h.redirect('/');
      return status;
    },
    options: {
      auth: {
        mode: 'try'
      }
    }
  }]);

  await server.start();
  console.log('server running at: ' + server.info.uri);
};

start();
