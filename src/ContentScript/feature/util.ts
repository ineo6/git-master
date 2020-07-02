import { GaEvent, IEvent } from '@/common/analytics';

// eslint-disable-next-line import/prefer-default-export
export function dataURItoArraybuffer(dataURI: string): ArrayBuffer {
  // convert base64/URLEncoded data component to raw binary data held in a string
  let byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataURI.split(',')[1]);
  } else {
    byteString = unescape(dataURI.split(',')[1]);
  }

  // write the bytes of the string to a typed array
  let ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return ia.buffer;
}

export const report = {
  event: GaEvent,
  send(ev: IEvent, opts: { action?: string; value?: number }) {
    const reportEvent = { ...ev };
    reportEvent.eventAction = opts.action || reportEvent.eventAction;
    reportEvent.eventValue = 'value' in opts ? opts.value : reportEvent.eventValue;

    // @ts-ignore
    window.postMessage({
      type: 'ga',
      data: reportEvent,
    });
  },
};
