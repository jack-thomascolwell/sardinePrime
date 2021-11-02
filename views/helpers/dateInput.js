'use strict';

const Moment = require('moment');

module.exports = function (dateString) {
  const date = new Date(dateString);
  return Moment(date).format("YYYY-MM-DD");
};
