'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toArray2 = require('babel-runtime/helpers/toArray');

var _toArray3 = _interopRequireDefault(_toArray2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

exports.default = Proc;

var _fs = require('mz/fs');

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

const CPU_FIELDS = ['user', 'nice', 'system', 'idle', 'iowait', 'irq', 'softirq', 'steal', 'guest', 'guest_nice'];

const PID_STAT = ['pid', 'comm', 'state', 'ppid', 'pgrp', 'session', 'tty_nr', 'tpgid', 'flags', 'minflt', 'cminflt', 'majflt', 'cmajflt', 'utime', 'stime', 'cutime', 'cstime', 'priority', 'nice', 'num_threads', 'itrealvalue', 'starttime', 'vsize', 'rss', 'rsslim', 'startcode', 'endcode', 'startstack', 'kstkesp', 'kstkeip', 'signal', 'blocked', 'sigignore', 'sigcatch', 'wchan', 'nswap', 'cnswap', 'exit_signal', 'processor', 'rt_priority', 'policy', 'delayacct_blkio_ticks', 'guest_time', 'cguest_time'];

const PID_STATM = ['size', 'rss', 'share', 'text', 'lib', 'data', 'dt'];

const NET_FIELDS = ['Bytes', 'Packets', 'Errs', 'Drop', 'Fifo', 'Frame', 'Compressed', 'Multicast'];

const IFACE_FIELDS = [...NET_FIELDS.map(v => `rx${ capitalize(v) }`), ...NET_FIELDS.slice(0, -1).map(v => `tx${ capitalize(v) }`)];

function readFile(file) {
  return (0, _fs.readFile)(file, { encoding: 'utf-8' });
}

function zip(keys, vals) {
  let zipper = arguments.length <= 2 || arguments[2] === undefined ? v => v : arguments[2];

  const ret = {};

  for (const k of keys.keys()) {
    const key = keys[k];
    ret[key] = zipper(vals[k], key);
  }

  return ret;
}

function ProcessProc(basePath, pid) {
  let stat = (() => {
    var ref = (0, _asyncToGenerator3.default)(function* () {
      const data = (yield readFile((0, _path.join)(basePath, pid, 'stat'))).split(' ');
      return zip(PID_STAT, data, function (v, k) {
        return ['comm', 'state'].indexOf(k) === -1 ? parseInt(v, 10) : v;
      });
    });
    return function stat() {
      return ref.apply(this, arguments);
    };
  })();

  let statm = (() => {
    var ref = (0, _asyncToGenerator3.default)(function* () {
      const data = (yield readFile((0, _path.join)(basePath, pid, 'statm'))).split(' ');

      return zip(PID_STATM, data, function (v) {
        return parseInt(v, 10);
      });
    });
    return function statm() {
      return ref.apply(this, arguments);
    };
  })();

  pid = pid.toString();

  return {
    stat,
    statm
  };
}

function Proc(basePath) {
  let mem = (() => {
    var ref = (0, _asyncToGenerator3.default)(function* () {
      const data = (yield readFile((0, _path.join)(basePath, 'meminfo'))).split(`\n`);
      const ret = {};

      for (const line of data) {
        var _ref = line.match(/(\w+):\s+(\d+).*/) || [];

        var _ref2 = (0, _slicedToArray3.default)(_ref, 3);

        const k = _ref2[1];
        const v = _ref2[2];

        if (k && v) {
          ret[k] = parseInt(v, 10);
        }
      }

      return ret;
    });
    return function mem() {
      return ref.apply(this, arguments);
    };
  })();

  let cpu = (() => {
    var ref = (0, _asyncToGenerator3.default)(function* () {
      const lines = (yield readFile((0, _path.join)(basePath, 'stat'))).split(`\n`);

      const ret = {};

      for (const line of lines) {
        if (line.indexOf('cpu') === 0) {
          var _line$split = line.split(/\s+/);

          var _line$split2 = (0, _toArray3.default)(_line$split);

          const k = _line$split2[0];

          const data = _line$split2.slice(1);

          ret[k] = zip(CPU_FIELDS, data, function (v) {
            return parseInt(v, 10);
          });
        }
      }

      return ret;
    });
    return function cpu() {
      return ref.apply(this, arguments);
    };
  })();

  let load = (() => {
    var ref = (0, _asyncToGenerator3.default)(function* () {
      var _split = (yield readFile((0, _path.join)(basePath, 'loadavg'))).split(' ');

      var _split2 = (0, _slicedToArray3.default)(_split, 3);

      const load1 = _split2[0];
      const load5 = _split2[1];
      const load15 = _split2[2];


      return {
        load1: parseFloat(load1),
        load5: parseFloat(load5),
        load15: parseFloat(load15)
      };
    });
    return function load() {
      return ref.apply(this, arguments);
    };
  })();

  let ps = (() => {
    var ref = (0, _asyncToGenerator3.default)(function* () {
      const pids = [];

      for (const f of yield (0, _fs.readdir)(basePath)) {
        try {
          const fstat = yield (0, _fs.stat)((0, _path.join)(basePath, f));

          if (fstat.isDirectory() && f.match(/^\d+$/)) {
            pids.push(parseInt(f, 10));
          }
        } catch (e) {
          if (e.code !== 'ENOENT') {
            throw e;
          }
        }
      }

      return pids;
    });
    return function ps() {
      return ref.apply(this, arguments);
    };
  })();

  let net = (() => {
    var ref = (0, _asyncToGenerator3.default)(function* () {
      var _split3 = (yield readFile((0, _path.join)(basePath, 'net', 'dev'))).split(`\n`);

      var _split4 = (0, _toArray3.default)(_split3);

      const data = _split4.slice(2);

      const ret = {};

      for (const line of data.filter(function (v) {
        return v.length > 0;
      })) {
        var _line$split$filter = line.split(/\s+/).filter(function (v) {
          return v.length > 0;
        });

        var _line$split$filter2 = (0, _toArray3.default)(_line$split$filter);

        const iface = _line$split$filter2[0];

        const lineVals = _line$split$filter2.slice(1);

        ret[iface] = zip(IFACE_FIELDS, lineVals, function (v) {
          return parseInt(v, 10);
        });
      }

      return ret;
    });
    return function net() {
      return ref.apply(this, arguments);
    };
  })();

  function procfs(pid) {
    return ProcessProc(basePath, pid);
  }

  return {
    mem,
    cpu,
    ps,
    procfs,
    load,
    net
  };
}