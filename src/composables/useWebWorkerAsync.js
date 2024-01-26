// ref: https://qiita.com/guguji_netaru/items/e6667459e1ad6af84445
export function useWebWorkerAsync() {
  function webWorkerAsync(task, arg) {
    return new Promise((resolve, reject) => {
      const taskString = `
          const task = ${task.toString()};
          this.onmessage = (arg) => {
            postMessage(task(JSON.parse(JSON.stringify(arg.data,(_key, value) => (value instanceof Set ? [...value] : value)))));
          }
      `;
      const blob = new Blob([taskString], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.addEventListener('message', m => {
        resolve(m.data);
      });
      worker.postMessage(arg);
    });
  }
  return { webWorkerAsync };
};