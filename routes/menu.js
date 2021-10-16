/*_id: Joi.any().forbidden(),
type: Joi.string(),
name: Joi.string(),
price: Joi.number().greater(0),
subtype: Joi.string(),
pctAlcohol: Joi.number().greater(0),
volume: Joi.string()*/

const Joi = require('joi');
const config = require('../config');

module.exports = [{
  method: 'GET',
  path: '/admin/menu',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');

    const menu = await request.mongo.db.collection('menu').find({}).sort({
      name: 1,
      _id: -1
    }).toArray();
    return h.view('menu', {
      menu: menu,
      admin: true
    });
  }
}, {
  method: 'GET',
  path: '/admin/menu/{id}',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const id = request.params.id;

    const menuItem = await request.mongo.db.collection('menu').findOne({
      _id: new request.mongo.ObjectID(id)
    });

    if (!menuItem) return h.redirect('/admin/menu');
    
    return h.view('menuItem', {
      menuItem: menuItem,
      admin: true
    });
  },
  options: {
    validate: {
      params: Joi.object({
        id: Joi.string().required(),
      }),
    },
  }
}, {
  method: 'POST',
  path: '/admin/menu/{id}',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const id = request.params.id;

    const menuItem = await request.mongo.db.collection('menu').findOne({
      _id: new request.mongo.ObjectID(id)
    });

    if (!menuItem) return h.redirect('/admin/menu');

    let payload = request.payload;
    console.log(payload);
    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      type: Joi.string(),
      name: Joi.string(),
      price: Joi.string(),
      subtype: Joi.string(),
      pctAlcohol: Joi.string(),
      volume: Joi.string()
    });
    const {
      error,
      value
    } = schema.validate(payload);

    if (error) {
      return h.view('menuItem', {
        menuItem: payload,
        error: error,
        admin: true
      });
    }

    const menuUpdate = {
      type: payload.type,
      name: payload.name,
      price: payload.price,
      subtype: payload.subtype,
      pctAlcohol: payload.pctAlcohol,
      volume: payload.volume,
    }

    const status = await request.mongo.db.collection('menu').updateOne({
      _id: new request.mongo.ObjectID(id)
    }, {
      $set: menuUpdate
    });
    if (status.acknowledged === true) return h.redirect(`/admin/menu/`);
    return status.acknowledged;
  },
  options: {
    validate: {
      params: Joi.object({
        id: Joi.string().required(),
      }),
    },
  }
}, {
  method: 'DELETE',
  path: '/admin/menu/{id}',
  handler: async (request, h) => {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const id = request.params.id;

    const menuItem = await request.mongo.db.collection('menu').findOne({
      _id: new request.mongo.ObjectID(id),
    }, {
      projection: {
        _id: 1
      }
    });

    if (!menuItem) return false;

    const status = await request.mongo.db.collection('menu').deleteOne({
      _id: new request.mongo.ObjectID(id)
    });
    return status.acknowledged;
  },
  options: {
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      })
    },
  }
}, {
  method: 'GET',
  path: '/admin/menu/new',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    return h.view('menu-new', {
      admin: true
    });
  }
}, {
  method: 'POST',
  path: '/admin/menu/new',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');

    let payload = request.payload;
    console.log([payload]);

    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      type: Joi.string().required(),
      name: Joi.string().required(),
      price: Joi.string().required(),
      subtype: Joi.string().required(),
      pctAlcohol: Joi.string().required(),
      volume: Joi.string().required()
    });
    const {
      error,
      value
    } = schema.validate(payload);

    if (error) {
      return h.view('menu-new', {
        menuItem: payload,
        error: error,
        admin: true
      });
    }

    const menuUpdate = {
      type: payload.type,
      name: payload.name,
      price: payload.price,
      subtype: payload.subtype,
      pctAlcohol: payload.pctAlcohol,
      volume: payload.volume,
    };

    const status = await request.mongo.db.collection('menu').insertOne(menuUpdate);
    if (status.acknowledged === true) return h.redirect(`/admin/menu`);
    return status.acknowledged;
  }
}];
