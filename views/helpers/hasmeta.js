'use strict';

module.exports = function(x, options) {
  if (x.subtype || x.pctAlcohol || x.volume) return options.fn(this)
  return options.inverse(this);
};
