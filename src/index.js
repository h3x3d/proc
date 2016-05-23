import { readdir, readFile as fsReadFile, stat } from 'mz/fs';
import { join } from 'path';

const CPU_FIELDS = [
  'user', 'nice', 'system', 'idle', 'iowait',
  'irq', 'softirq', 'steal', 'guest', 'guest_nice'
];

const PID_STAT = [
  'pid', 'comm', 'state', 'ppid', 'pgrp', 'session', 'tty_nr', 'tpgid', 'flags',
  'minflt', 'cminflt', 'majflt', 'cmajflt', 'utime', 'stime', 'cutime', 'cstime',
  'priority', 'nice', 'num_threads', 'itrealvalue', 'starttime', 'vsize', 'rss',
  'rsslim', 'startcode', 'endcode', 'startstack', 'kstkesp', 'kstkeip', 'signal',
  'blocked', 'sigignore', 'sigcatch', 'wchan', 'nswap', 'cnswap', 'exit_signal',
  'processor', 'rt_priority', 'policy', 'delayacct_blkio_ticks', 'guest_time',
  'cguest_time'
];

const PID_STATM = [
  'size',
  'rss',
  'share',
  'text',
  'lib',
  'data',
  'dt'
];

const NET_FIELDS = ['bytes', 'packets', 'errs', 'drop', 'fifo', 'frame', 'compressed', 'multicast'];

const IFACE_FIELDS = [
  ...NET_FIELDS.map(v => `rx_${v}`),
  ...NET_FIELDS.slice(0, -1).map(v => `tx_${v}`)
];

const DISK_FIELDS = [
  'device_number', 'device_number_minor', 'device',
  'reads_completed', 'reads_merged', 'sectors_read', 'ms_reading',
  'writes_completed', 'writes_merged', 'sectors_written', 'ms_writing',
  'ios_pending', 'ms_io', 'ms_weighted_io'
];

function readFile(file) {
  return fsReadFile(file, { encoding: 'utf-8' });
}

function zip(keys, vals, zipper = v => v) {
  const ret = {};

  for (const k of keys.keys()) {
    const key = keys[k];
    ret[key] = zipper(vals[k], key);
  }

  return ret;
}

function ProcessProc(basePath, pid) {

  pid = pid.toString();

  async function stat() {
    const data = (await readFile(join(basePath, pid, 'stat'))).split(' ');
    return zip(PID_STAT, data, (v, k) => (
        ['comm', 'state'].indexOf(k) === -1 ? parseInt(v, 10) : v
      )
    );
  }

  async function statm() {
    const data = (await readFile(join(basePath, pid, 'statm'))).split(' ');

    return zip(PID_STATM, data, v => parseInt(v, 10));
  }

  return {
    stat,
    statm
  };
}


export default function Proc(basePath) {
  function procfs(pid) {
    return ProcessProc(basePath, pid);
  }

  async function mem() {
    const data = (await readFile(join(basePath, 'meminfo'))).split(`\n`);
    const ret = {};

    for (const line of data) {
      const [, k, v] = line.match(/(\w+):\s+(\d+).*/) || [];
      if (k && v) {
        ret[k] = parseInt(v, 10);
      }
    }

    return ret;
  }

  async function cpu() {
    const lines = (await readFile(join(basePath, 'stat'))).split(`\n`);

    const ret = {};

    for (const line of lines) {
      if (line.indexOf('cpu') === 0) {
        const [k, ...data] = line.split(/\s+/);

        ret[k] = zip(CPU_FIELDS, data, v => parseInt(v, 10));
      }
    }

    return ret;
  }

  async function load() {
    const [load1, load5, load15] = (await readFile(join(basePath, 'loadavg'))).split(' ');

    return {
      load1: parseFloat(load1),
      load5: parseFloat(load5),
      load15: parseFloat(load15)
    };
  }

  async function disk() {
    const data = (await readFile(join(basePath, 'diskstats'))).split(`\n`);
    const ret = {};

    for (const line of data.filter(v => v.length > 0)) {
      const lineData = zip(
        DISK_FIELDS,
        line.split(/\s+/).filter(v => v.length > 0),
        (v, k) => (k === 'device' ? v : parseInt(v, 10))
      );

      ret[lineData.device] = lineData;
    }

    return ret;
  }

  async function ps() {
    const pids = [];

    for (const f of await readdir(basePath)) {
      try {
        const fstat = await stat(join(basePath, f));

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
  }

  async function net() {
    const [, , ...data] = (await readFile(join(basePath, 'net', 'dev'))).split(`\n`);
    const ret = {};

    for (const line of data.filter(v => v.length > 0)) {
      const [iface, ...lineVals] = line.split(/:?\s+/).filter(v => v.length > 0);
      ret[iface] = zip(IFACE_FIELDS, lineVals, v => parseInt(v, 10));
    }

    return ret;
  }

  return {
    mem,
    cpu,
    ps,
    procfs,
    load,
    net,
    disk
  };
}
