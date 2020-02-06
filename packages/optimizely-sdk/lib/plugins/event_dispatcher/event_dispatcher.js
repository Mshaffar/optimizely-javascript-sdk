/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logging = require('@optimizely/js-sdk-logging');

var logger = logging.getLogger('EventDispatcher');

/**
 *
 * @param {Object}    options
 * @param {Function}  options.requestFn
 */
function EventDispatcher(options) {
  this.__requestFn = options.requestFn;
  this.__requestCallbacks = [];
  this.__closeResolvers = [];
  this.__closed = false;
}

EventDispatcher.prototype.dispatchEvent = function(eventObj, callback) {
  if (this.__closed) {
    logger.error('This dispatcher is closed and not accepting new events (received event: %s', function() {
      return JSON.stringify(eventObj);
    });
    return;
  }

  var onReqComplete = function() {
    var indexToRemove = this.__requestCallbacks.indexOf(onReqComplete);
    if (indexToRemove >= 0) {
      this.__requestCallbacks.splice(indexToRemove, 1);
    }
    this.__notifyRequestCompleted();
    logger.debug('Response received')
    callback();
  }.bind(this);
  // TODO: Limit the size of request callbacks array. Drop requests and log an error when full.
  this.__requestCallbacks.push(onReqComplete);
  this.__requestFn(eventObj, onReqComplete);
  logger.debug('Sending request: %s', function() {
    return JSON.stringify(eventObj)
  });
};

EventDispatcher.prototype.__notifyRequestCompleted = function() {
  if (this.__requestCallbacks.length === 0) {
    this.__closeResolvers.forEach(function(resolve) {
      resolve();
    });
    this.__closeResolvers = [];
  }
};

// TODO: timeout?
EventDispatcher.prototype.close = function() {
  logger.debug('Closing')
  return new Promise(function(resolve) {
    this.__closed = true;
    if (this.__requestCallbacks.length === 0) {
      logger.debug('All in-flight requests complete, close complete');
      resolve();
    } else {
      this.__closeResolvers.push(resolve);
    }
  }.bind(this));
};

module.exports = {
  EventDispatcher: EventDispatcher,
}
