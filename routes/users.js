const Joi = require('joi');
const Bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = [{
  method: 'GET',
  path: '/admin/users',
  handler: async (request, h) => {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const users = await request.mongo.db.collection('users').find({
      _id: {
        $not: {
          $in: [request.auth.credentials._id]
        }
      }
    }, {
      projection: {
        email: 1,
        admin: 1,
        _id: 1
      }
    }).sort({
      _id: -1
    }).toArray();
    return h.view('users', {
      users: users,
      self: request.auth.credentials
    });
  }
}, {
  method: 'PUT',
  path: '/admin/users/{id}',
  handler: async (request, h) => {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const userId = request.auth.credentials._id;
    const id = request.params.id;
    if (userId == id) return h.response('Cannot edit self').code(401);
    const status = await request.mongo.db.collection('users').updateOne({
      _id: new request.mongo.ObjectID(id)
    }, {
      $set: request.payload
    });
    return status;
  },
  options: {
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      }),
      payload: Joi.object({
        _id: Joi.any().forbidden(),
        email: Joi.any().forbidden(),
        password: Joi.any().forbidden(),
        admin: Joi.boolean()
      })
    }
  }
}, {
  method: 'GET',
  path: '/admin',
  handler: function(request, h) {
    if (request.auth.isAuthenticated)
      return h.redirect('/');

    return h.view('login', {
      login: true
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
    if (request.auth.isAuthenticated)
      return h.redirect('/');

    let payload = request.payload;
    if (payload.email) payload.email = payload.email.toLowerCase();

    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      email: Joi.string().required(),
      password: Joi.string().required(),
    });

    const {
      error,
      value
    } = schema.validate(payload);

    if (error) return h.view('login', {
      email: payload.email,
      login: true
    });

    const {
      email,
      password
    } = payload;

    const account = await request.mongo.db.collection('users').findOne({
      email: email
    });

    if (!account || !(await Bcrypt.compare(password, account.password))) {
      return h.view('login', {
        error: 'Incorrect email or password',
        email: email,
        login: true,
      });
    }

    request.cookieAuth.set({
      _id: account._id
    });

    return h.redirect('/');
  },
  options: {
    auth: {
      mode: 'try'
    }
  }
}, {
  method: 'GET',
  path: '/logout',
  handler: async (request, h) => {
    request.cookieAuth.clear();
    return h.redirect('/');
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
      return h.redirect('/');
    return h.view('register', {
      login: true
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
      return h.redirect('/');

    let payload = request.payload;

    if (payload.email) payload.email = payload.email.toLowerCase();

    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      email: Joi.string().email(),
      password: Joi.string(),
      repeat_password: Joi.ref('password'),
      admin: Joi.any().forbidden()
    });
    const {
      error,
      value
    } = schema.validate(payload);

    if (error) return h.view('register', {
      error: error,
      user: payload,
      login: true
    });

    const existingUsers = await request.mongo.db.collection('users').find({
      email: payload.email,
    }).toArray();

    if (existingUsers.length > 0) return h.view('register', {
      error: 'User with email already exists',
      user: payload,
      login: true
    });

    const newUser = {
      email: payload.email,
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
}, {
  method: 'DELETE',
  path: '/admin/users/{id}',
  handler: async (request, h) => {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const status = await request.mongo.db.collection('users').deleteOne({
      _id: new request.mongo.ObjectID(request.params.id)
    });
    return status;
  },
  options: {
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      })
    }
  }
}];
