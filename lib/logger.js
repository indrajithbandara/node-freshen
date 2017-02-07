// Generated by CoffeeScript 1.12.3
var _logBuffer, colorEnd, colorError, colorInfo, colorLog, colorNote, colorWarn, esc, log, msgFun;

esc = String.fromCharCode(27);

colorInfo = '';

colorLog = '';

colorNote = '';

colorWarn = '';

colorError = '';

colorEnd = '';

log = console.log;

_logBuffer = [];

msgFun = function(msg, conf) {
  var stamp;
  stamp = (new Date().toLocaleTimeString()) + " ";
  if (conf && conf.prefix) {
    stamp += conf.prefix;
  }
  msg = msg.replace(/[\r\n]+$/, '');
  _logBuffer.push([stamp, msg]);
  return "" + (msg.replace(/^/gm, conf.color).replace(/$/gm, colorEnd).replace(/^/gm, stamp));
};

module.exports = {
  loggerConf: function(conf) {
    if (conf.color) {
      colorInfo = esc + '[0;33m';
      colorNote = esc + '[0;32m';
      colorLog = esc + '[0;36m';
      colorWarn = esc + '[0;35m';
      colorError = esc + '[0;31m';
      return colorEnd = esc + '[0m';
    } else {
      colorInfo = '';
      colorNote = '';
      colorLog = '';
      colorWarn = '';
      colorError = '';
      return colorEnd = '';
    }
  },
  loggerBuffer: _logBuffer,
  info: function(msg, conf) {
    conf || (conf = {
      prefix: ''
    });
    conf.color = colorInfo;
    return log(msgFun(msg, conf));
  },
  note: function(msg, conf) {
    conf || (conf = {
      prefix: ''
    });
    conf.color = colorNote;
    return log(msgFun(msg, conf));
  },
  log: function(msg, conf) {
    conf || (conf = {
      prefix: ''
    });
    conf.color = colorLog;
    return log(msgFun(msg, conf));
  },
  warn: function(msg, conf) {
    conf || (conf = {
      prefix: ''
    });
    conf.color = colorWarn;
    conf.prefix = "WARNING " + conf.prefix;
    return log(msgFun(msg, conf));
  },
  error: function(msg, conf) {
    conf || (conf = {
      prefix: ''
    });
    conf.color = colorError;
    conf.prefix = "ERROR " + conf.prefix;
    return log(msgFun(msg, conf));
  }
};