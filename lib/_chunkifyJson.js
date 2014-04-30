'use strict';

function chunkifyJson(json) {
  return new Buffer(JSON.stringify(json), 'utf8');
}

module.exports = chunkifyJson;
