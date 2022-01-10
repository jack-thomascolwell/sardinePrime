'use strict';

module.exports = function(x, options) {
  if (x.price.toLowerCase().trim() === '0' || x.price === 0 || x.price.toLowerCase().trim() === 'free') return options.fn(this)
  return options.inverse(this);
};
