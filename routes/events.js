const Joi = require('joi');
const config = require('../config');

/*
Event Schema
{
_id: ObjectID,
name: string,
date: datetime,
price: string,
description: string,
ticket: string,
image: ObjectID
}
*/

module.exports = [{
  method: 'GET',
  path: '/admin/events',
  handler: async function(request, h) {
    console.log([request.auth.isAuthenticated, request.auth.credentials.admin]);
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');

    const events = await request.mongo.db.collection('events').find({}).sort({
      date: -1,
      _id: -1
    }).toArray();
    return h.view('events', {
      events: events,
      admin: true
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

    if (!thisEvent) return h.redirect('/admin/menu');

    return h.view('event', {
      event: thisEvent,
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
    if (payload.image.hapi.filename == '') payload.image = undefined;

    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      name: Joi.string(),
      date: Joi.date(),
      price: Joi.string(),
      description: Joi.string(),
      ticket: Joi.string(),
      image: Joi.any(),
    });
    const {
      error,
      value
    } = schema.validate(payload);

    if (error) {
      return h.view('event', {
        event: payload,
        error: error,
        admin: true
      });
    }

    const eventUpdate = {
      name: payload.name,
      date: payload.date,
      price: payload.price,
      description: payload.description,
      ticket: payload.ticket,
    }

    if (payload.image) {
      const bucket = new request.mongo.lib.GridFSBucket(request.mongo.db);
      const oldImage = thisEvent.image;
      const oldImageDoc = await bucket.find({
        _id: oldImage
      });
      if (oldImageDoc && oldImageDoc[0]) await bucket.delete(oldImage);
      const newImage = (payload.image.pipe(bucket.openUploadStream('image', {
        chunkSizeBytes: 1048576,
        metadata: {
          originalFilename: payload.image.hapi.filename,
          type: payload.image.hapi.headers['content-type']
        }
      })).id);
      eventUpdate.image = newImage;
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
        image: 1,
        _id: 1
      }
    });

    if (!thisEvent) return false;

    const bucket = new request.mongo.lib.GridFSBucket(request.mongo.db);
    bucket.delete(thisEvent.image);

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
    return h.view('event-new', {
      admin: true
    });
  }
}, {
  method: 'POST',
  path: '/admin/events/new',
  handler: async function(request, h) {
    if (!request.auth.isAuthenticated || (request.auth.credentials.admin !== true))
      return h.redirect('/');

    let payload = request.payload;

    if (payload.image.hapi.filename == '') payload.image = undefined;

    const schema = Joi.object({
      _id: Joi.any().forbidden(),
      name: Joi.string().required(),
      date: Joi.date().required(),
      price: Joi.string().required(),
      description: Joi.string().required(),
      ticket: Joi.string().required(),
      image: Joi.any().required(),
    });
    const {
      error,
      value
    } = schema.validate(payload);

    if (error) {
      return h.view('event-new', {
        event: payload,
        error: error,
        admin: true
      });
    }

    const bucket = new request.mongo.lib.GridFSBucket(request.mongo.db);
    const imageID = (payload.image.pipe(bucket.openUploadStream('image', {
      chunkSizeBytes: 1048576,
      metadata: {
        originalFilename: payload.image.hapi.filename,
        type: payload.image.hapi.headers['content-type']
      }
    })).id);

    const eventUpdate = {
      name: payload.name,
      date: payload.date,
      price: payload.price,
      description: payload.description,
      ticket: payload.ticket,
      image: imageID
    };

    const status = await request.mongo.db.collection('events').insertOne(eventUpdate);
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
  }
}, {
  method: 'GET',
  path: '/events/{id}/image',
  handler: async (request, h) => {
    const id = request.params.id;
    const thisEvent = await request.mongo.db.collection('events').findOne({
      _id: new request.mongo.ObjectID(id),
    }, {
      projection: {
        image: 1,
        _id: 1,
      }
    });
    if (!thisEvent) return h.response('Event not found').code(404);
    const bucket = new request.mongo.lib.GridFSBucket(request.mongo.db);
    const matchingIDs = await bucket.find({
      _id: thisEvent.image
    }).project({
      _id: 1,
      filename: 1,
      metadata: 1,
    }).toArray();
    if (!matchingIDs || !matchingIDs[0]) return h.response('Image not found').code(404);
    const stream = bucket.openDownloadStream(matchingIDs[0]._id);
    return h.response(stream).header('Content-Disposition', `attachment; filename= ${matchingIDs[0].metadata.originalFilename}`).type(matchingIDs[0].metadata.type);
  },
  options: {
    auth: false,
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      })
    }
  }
}];
