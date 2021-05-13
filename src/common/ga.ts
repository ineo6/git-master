/**
 * simple ga
 */
import extStore from './core.storage';
import TimeoutQueue from './timeout-queue';

const timeoutQueue = new TimeoutQueue();

class GoogleAnalytics {
  constructor(trackingId: string) {
    this.analyticsId = trackingId;

    this.init();
    this.initUserUniqueId();
  }

  analyticsId = '';

  xhr: XMLHttpRequest | undefined;

  userUniqueId: number = 0;

  storeUniqueId(uniqueId: number) {
    this.userUniqueId = uniqueId;
    extStore.set('_user_unique_id', uniqueId);
  }

  async retrieveUniqueId() {
    const uid = await extStore.get('_user_unique_id');

    return uid;
  }

  makeRandomId() {
    return 1000000000 + Math.floor(Math.random() * (2147483647 - 1000000000));
  }

  async initUserUniqueId() {
    if (this.userUniqueId) {
      return;
    }

    let uniqueId = await this.retrieveUniqueId();
    if (uniqueId) {
      this.userUniqueId = uniqueId;
    } else {
      this.userUniqueId = this.makeRandomId();
      this.storeUniqueId(this.userUniqueId);
    }
  }

  init() {
    this.xhr = new XMLHttpRequest();
  }

  qsStringify(obj: any) {
    const s = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key]) {
        s.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
      }
    }
    return s.join('&');
  }

  addRequest(opts: any) {
    let url = 'http://www.google-analytics.com/collect';
    let params = this.qsStringify({
      v: 1,
      tid: this.analyticsId,
      cid: this.userUniqueId,
      t: opts[0] || 'pageview',
      ec: opts[1],
      ea: opts[2],
      el: opts[3],
      ev: opts[4],
      z: 1000000000 + Math.floor(Math.random() * (2147483647 - 1000000000)),
    });

    const self = this;

    timeoutQueue.add(function() {
      self.xhr?.open('POST', url, true);
      // @ts-ignore
      if (self.xhr?.channel) {
        // firefox customization
        // @ts-ignore
        self.xhr.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
      }
      self.xhr?.send(params);
    });
  }

  req(args: any) {
    if (this.userUniqueId) {
      this.addRequest(args);
    }
  }

  send(opts: [string, string, string, string, string, string, string]) {
    const [type, ...eventOpts] = opts;

    if (type === '_trackEvent') {
      this.req(['event', ...eventOpts]);
    }
  }
}

function GoogleAnalyticsService(trackingId: string) {
  if (!GoogleAnalyticsService.prototype._singletonInstance) {
    GoogleAnalyticsService.prototype._singletonInstance = new GoogleAnalytics(trackingId);
  }

  return GoogleAnalyticsService.prototype._singletonInstance;
}

export default GoogleAnalyticsService;
