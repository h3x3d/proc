# Proc #

Collects system info from /procfs

```javascript
import Proc from './src';

async function work() {
  const proc = Proc('/proc');

  console.log(await proc.mem());
  console.log(await proc.ps());
  console.log(await proc.cpu());
  console.log(await proc.load());

  const init = proc.procfs(1);

  console.log(await init.stat());
  console.log(await init.statm());

  console.log(await proc.net());
}

work().catch(console.error);
```
