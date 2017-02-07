// Generated by CoffeeScript 1.12.3
var Watcher, child_process, error, info, log, loggerConf, note, ref, warn, watchDirs,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

child_process = require('child_process');

watchDirs = require('./watchDirs');

ref = require('./logger'), loggerConf = ref.loggerConf, info = ref.info, note = ref.note, log = ref.log, warn = ref.warn, error = ref.error;

Watcher = (function() {
  function Watcher(conf, onChange) {
    this.conf = conf;
    this.runReport = bind(this.runReport, this);
    this.runBuild = bind(this.runBuild, this);
    this.stop = bind(this.stop, this);
    this.delay = this.conf.delay;
    this.dir = this.conf.root || '.';
    this.report = this.conf.report;
    this.build = this.conf.build;
    this.onChange = onChange || warn;
    this.batchWaiting = false;
    this.doBuild = false;
    this.doReport = false;
    this.reportBatch = {};
    loggerConf(this.conf);
  }

  Watcher.prototype.start = function(next) {
    return this.runBuild(this.build.command, (function(_this) {
      return function(err) {
        var onEvent;
        if (err) {
          return next(err);
        }
        info("Watching " + _this.dir);
        onEvent = function(event, relativeFile) {
          var matchBuild, matchReport;
          relativeFile = relativeFile.replace(/^\.\//, '');
          matchReport = (_this.report[event] || []).some(function(rx) {
            return rx.test(relativeFile);
          });
          matchBuild = (_this.build.deps || []).some(function(rx) {
            return rx.test(relativeFile);
          });
          if (matchReport || matchBuild) {
            if (!_this.batchWaiting) {
              _this.batchWaiting = true;
              _this.timeoutId = setTimeout(function() {
                _this.timeoutId = null;
                if (_this.doBuild) {
                  return _this.runBuild(_this.build.command, _this.runReport);
                } else if (_this.doReport) {
                  return _this.runReport();
                }
              }, _this.delay);
            }
            if (matchBuild) {
              _this.doBuild = true;
            }
            if (matchReport) {
              _this.doReport = true;
              return _this.reportBatch[event + "-" + relativeFile] = [event, relativeFile];
            }
          }
        };
        return watchDirs('.', _this.conf.exclude || /\/\/\//, onEvent, function(err, watchers) {
          _this.watchers = watchers;
          return next(err);
        });
      };
    })(this));
  };

  Watcher.prototype.stop = function(next) {
    var i, len, ref1, watcher;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    ref1 = this.watchers;
    for (i = 0, len = ref1.length; i < len; i++) {
      watcher = ref1[i];
      watcher.close();
    }
    return this.watchers = null;
  };

  Watcher.prototype.runBuild = function(command, next) {
    return child_process.exec(command, (function(_this) {
      return function(err, stdout, stderr) {
        if (err) {
          return next(error(("" + err) + stderr || ''));
        }
        if (stdout) {
          log(stdout);
        }
        if (stderr) {
          warn(stderr);
        }
        (next || function() {})();
        return _this.doBuild = false;
      };
    })(this));
  };

  Watcher.prototype.runReport = function() {
    var changeCount, changes, event, key, ref1, relativeFile;
    changes = {};
    changeCount = 0;
    for (key in this.reportBatch) {
      changeCount += 1;
      ref1 = this.reportBatch[key], event = ref1[0], relativeFile = ref1[1];
      if (!changes.hasOwnProperty(event)) {
        changes[event] = [];
      }
      changes[event].push(relativeFile);
    }
    if (changeCount > 0) {
      this.onChange(changes);
      this.reportBatch = {};
    }
    this.doReport = false;
    this.batchWaiting = false;
    return log('___________________________________________');
  };

  return Watcher;

})();

module.exports = Watcher;