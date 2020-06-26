import { STORE } from '@/common/core.constants';
import extStore from '@/common/core.storage';

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
  constructor() {
    window._gaq = window._gaq || [];
    this.register();
  }

  event = GaEvent;

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

  initialize(trackingId: string) {
    window._gaq.push(['_setAccount', trackingId]);
    window._gaq.push(['_trackPageview']);
  }

  page(page: string) {
    if (page) {
      if (process.env.NODE_ENV === 'production') {
        window._gaq.push(['_trackPageview', page]);
      }
    }
  }

  eventCore(event: IEvent) {
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
          window._gaq.push(['_trackEvent', ...eventArr]);
        }
      });
    } else {
      // eslint-disable-next-line no-console
      console.log(event);
    }
  }

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

  error(label = 'unknown', action = 'unknownMethod') {
    const ev = {
      eventCategory: 'error',
      eventAction: action,
      eventLabel: `Err: ${label}`,
    };

    this.eventCore(ev);
  }

  exception(exception: any, message: string = '') {
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
}
