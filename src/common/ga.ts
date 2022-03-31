/**
 * simple ga
 */
import extStore from './core.storage';
import TimeoutQueue from './timeout-queue';

const timeoutQueue = new TimeoutQueue();

class GoogleAnalytics {
  private analyticsId = '';

  private xhr: XMLHttpRequest | undefined;

  private userUniqueId = 0;

  public constructor(trackingId: string) {
    this.analyticsId = trackingId;

    this.init();
    this.initUserUniqueId();
  }

  public send(opts: [string, string, string, string, string, string, string]) {
    const [type, ...eventOpts] = opts;

    if (type === '_trackEvent') {
      this.req(['event', ...eventOpts]);
    }
  }

  private storeUniqueId(uniqueId: number) {
    this.userUniqueId = uniqueId;
    extStore.set('_user_unique_id', uniqueId);
  }

  private async retrieveUniqueId() {
    const uid = await extStore.get('_user_unique_id');

    return uid;
  }

  private makeRandomId() {
    return 1000000000 + Math.floor(Math.random() * (2147483647 - 1000000000));
  }

  private async initUserUniqueId() {
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

  private init() {
    this.xhr = new XMLHttpRequest();
  }

  private qsStringify(obj: any) {
    const s = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key]) {
        s.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
      }
    }
    return s.join('&');
  }

  private addRequest(opts: any) {
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

    // eslint-disable-next-line @typescript-eslint/no-this-alias
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

  private req(args: any) {
    if (this.userUniqueId) {
      this.addRequest(args);
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
