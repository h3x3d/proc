# Proc #

Collects system info from /procfs

```javascript

import Proc from 'proc';

async function work() {
  const proc = Proc('/proc');

  console.log(await proc.mem());
  console.log(await proc.ps());
  console.log(await proc.cpu());
  console.log(await proc.load());
  console.log(await proc.net());
  console.log(await proc.disk());

  const init = proc.procfs(1);

  console.log(await init.stat());
  console.log(await init.statm());
}

work().catch(console.error);
```
