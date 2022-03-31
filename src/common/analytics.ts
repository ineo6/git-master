import { STORE } from '@/common/core.constants';
import extStore from '@/common/core.storage';
import GoogleAnalyticsService from './ga';

export interface IEvent {
  eventCategory: string;
  eventAction: string;
  eventLabel?: string;
  eventValue?: number;
  noninteraction?: boolean;
}

export const GaEvent = {
  INSTALLED: {
    eventCategory: 'extension',
    eventAction: 'installed',
    eventLabel: '',
  },
  UPDATED: {
    eventCategory: 'extension',
    eventAction: 'updated',
    eventLabel: '',
  },
  USE_GIT_HISTORY: {
    eventCategory: 'git-history',
    eventAction: '',
    eventLabel: 'feature usage',
  },
  FOLDER_DOWNLOAD: {
    eventCategory: 'folder-download',
    eventAction: '',
    eventLabel: 'feature usage',
  },
  DARK_MODE: {
    eventCategory: 'dark-mode',
    eventAction: '',
    eventLabel: 'feature usage',
  },
  DISABLE_BUILD_IN_DARK: {
    eventCategory: 'dark-mode',
    eventAction: '',
    eventLabel: 'close build in',
  },
  VIEW_POSITION: {
    eventCategory: 'view-position',
    eventAction: '',
    eventLabel: 'feature usage',
  },
  EXCEPTION: {
    eventCategory: 'global',
    eventAction: 'exception',
    eventLabel: '',
  },
  SITE_ENABLE: {
    eventCategory: 'site-enable',
    eventAction: '',
    eventLabel: 'feature usage',
  },
};

export default class Analytics {
  public event = GaEvent;

  private readonly isFirefox: boolean;

  private ga: any;

  private readonly trackingId: string;

  private readonly disableFirefox: boolean;

  public constructor(trackingId: string, disableFirefox: boolean) {
    this.isFirefox = process.env.TARGET_BROWSER === 'firefox';

    this.trackingId = trackingId;
    this.disableFirefox = disableFirefox;

    if (!this.isFirefox) {
      window._gaq = window._gaq || [];
      this.register();
    } else if (!disableFirefox) {
      // @ts-ignore
      this.ga = new GoogleAnalyticsService();
    }
  }

  public pushQueue(queue: any[]) {
    if (this.isFirefox) {
      !this.disableFirefox && this.ga.send(queue);
    } else {
      window._gaq.push(queue);
    }
  }

  public initialize() {
    this.pushQueue(['_setAccount', this.trackingId]);
    this.pushQueue(['_trackPageview']);
  }

  public page(page: string) {
    if (page) {
      if (process.env.NODE_ENV === 'production') {
        this.pushQueue(['_trackPageview', page]);
      }
    }
  }

  // eslint-disable-next-line max-params
  public sendEvent(event: IEvent, action?: string, label?: string, value?: number, noninteraction?: boolean) {
    if (event) {
      const ev = { ...event };
      ev.eventAction = action || ev.eventAction;
      ev.eventLabel = label || ev.eventLabel;
      ev.eventValue = value || ev.eventValue;
      ev.noninteraction = noninteraction || ev.noninteraction;

      this.eventCore(ev);
    }
  }

  public error(label = 'unknown', action = 'unknownMethod') {
    const ev = {
      eventCategory: 'error',
      eventAction: action,
      eventLabel: `Err: ${label}`,
    };

    this.eventCore(ev);
  }

  public exception(exception: any, message = '') {
    try {
      let msg = 'Unknown';
      if (message) {
        msg = message;
      } else if (exception.message) {
        msg = exception.message;
      }
      if (exception.stack) {
        msg += `\n\n${exception.stack}`;
      }

      const ev = { ...GaEvent.EXCEPTION };

      ev.eventLabel = msg;

      this.eventCore(ev);
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }

  private register() {
    (function() {
      const ga = document.createElement('script');
      ga.type = 'text/javascript';
      ga.async = true;
      ga.src = 'https://ssl.google-analytics.com/ga.js';
      const s = document.getElementsByTagName('script')[0];
      // @ts-ignore
      s.parentNode.insertBefore(ga, s);
    })();
  }

  private eventCore(event: IEvent) {
    const eventArr: any[] = [];

    ['eventCategory', 'eventAction', 'eventLabel', 'eventValue', 'noninteraction'].forEach((key: string) => {
      if (key in event) {
        // @ts-ignore
        eventArr.push(event[key]);
      }
    });

    if (process.env.NODE_ENV === 'production') {
      extStore.get(STORE.ANALYSIS).then((result: boolean) => {
        if (result) {
          this.pushQueue(['_trackEvent', ...eventArr]);
        }
      });
    } else {
      // eslint-disable-next-line no-console
      console.log(event);
    }
  }
}
