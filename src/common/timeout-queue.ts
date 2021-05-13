class TimeoutQueue {
  running = false;

  queue: Function[] = [];

  timeout = 300;

  add(callback: Function) {
    this.queue.push(() => {
      const finished = callback();

      if (typeof finished === 'undefined' || finished) {
        this.next();
      }
    });

    if (!this.running) {
      this.next();
    }

    return this;
  }

  next() {
    this.running = false;
    const shift = this.queue.shift();

    if (shift) {
      this.running = true;
      setTimeout(shift, this.timeout);
    }
  }
}

export default TimeoutQueue;
