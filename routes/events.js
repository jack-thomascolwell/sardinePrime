const Joi = require('joi');
const Stream = require('stream');
const config = require('../config');

const {
  deleteFile,
  uploadFileStream
} = require('../files');

/*
Event Schema
{
_id: ObjectID,
name: string,
date: datetime,
price: string,
description: string,
ticket: string
}
*/

module.exports = [{
  method: 'GET',
  path: '/admin/events',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');

    const events = await request.mongo.db.collection('events').find({}).sort({
      date: 1,
      _id: -1
    }).toArray();
    return h.view('events', {
      events: events
    });
  }
}, {
  method: 'GET',
  path: '/admin/events/{id}',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const id = request.params.id;
    const thisEvent = await request.mongo.db.collection('events').findOne({
      _id: new request.mongo.ObjectID(id)
    });

    if (!thisEvent) return h.response('Event not found').code(404);
    return h.view('event', {
      event: thisEvent,
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
  path: '/admin/events/{id}',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const id = request.params.id;

    const thisEvent = await request.mongo.db.collection('events').findOne({
      _id: new request.mongo.ObjectID(id)
    });

    if (!thisEvent) return h.redirect('/admin/events');

    let payload = request.payload;
    if (payload.newImage && payload.newImage.hapi.filename == '') payload.newImage = undefined;

    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      name: Joi.string(),
      date: Joi.date(),
      price: Joi.string().allow(''),
      description: Joi.string().allow(''),
      ticket: Joi.string().allow(''),
      newImage: Joi.any(),
      removeImage: Joi.boolean(),
    });
    const {
      error,
      value
    } = schema.validate(payload);

    if (error) {
      return h.view('event', {
        event: payload,
        error: error
      });
    }

    const eventUpdate = {
      name: value.name,
      date: value.date,
      price: value.price,
      description: value.description,
      ticket: value.ticket,
    }

    if (value.removeImage) {
      await deleteFile(`events/${id}/image`);
    } else if (value.newImage) {
      await deleteFile(`events/${id}/image`);
      const blobStream = uploadFileStream(`events/${id}/image`);
      value.newImage.pipe(blobStream);
    }

    const status = await request.mongo.db.collection('events').updateOne({
      _id: new request.mongo.ObjectID(id)
    }, {
      $set: eventUpdate
    });
    if (status.acknowledged === true) return h.redirect(`/admin/events`);
    return status.acknowledged;
  },
  options: {
    payload: {
      maxBytes: 500 * 1048576, //500MB
      output: 'stream',
      parse: true,
      multipart: true
    },
    validate: {
      params: Joi.object({
        id: Joi.string().required(),
      }),
    },
  }
}, {
  method: 'DELETE',
  path: '/admin/events/{id}',
  handler: async (request, h) => {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    const id = request.params.id;

    const thisEvent = await request.mongo.db.collection('events').findOne({
      _id: new request.mongo.ObjectID(id),
    }, {
      projection: {
        _id: 1
      }
    });

    if (!thisEvent) return false;

    await deleteFile(`events/${id}/image`);

    const status = await request.mongo.db.collection('events').deleteOne({
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
  path: '/admin/events/new',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');
    return h.view('event-new');
  }
}, {
  method: 'POST',
  path: '/admin/events/new',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');

    let payload = request.payload;

    if (payload.image && payload.image.hapi.filename == '') payload.image = undefined;

    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      name: Joi.string().required(),
      date: Joi.date().required(),
      price: Joi.string().allow(''),
      description: Joi.string().allow(''),
      ticket: Joi.string().allow(''),
      image: Joi.any(),
    });
    const {
      error,
      value
    } = schema.validate(payload);

    if (error) {
      return h.view('event-new', {
        event: payload,
        error: error,
      });
    }

    const newEvent = {
      name: value.name,
      date: value.date,
      price: value.price,
      description: value.description,
      ticket: value.ticket,
    }

    const status = await request.mongo.db.collection('events').insertOne(newEvent);
    if (status.acknowledged !== true) return false;

    // File uploads
    if (value.image) {
      const blobStream = uploadFileStream(`events/${status.insertedId}/image`);
      value.image.pipe(blobStream);
    }

    return h.redirect(`/admin/events`);
  },
  options: {
    payload: {
      maxBytes: 500 * 1048576, //500MB
      output: 'stream',
      parse: true,
      multipart: true
    },
  }
}];
