import { GaEvent, IEvent } from '@/common/analytics';

// eslint-disable-next-line import/prefer-default-export
export function dataURItoBlob(dataURI: string): Blob {
  // convert base64/URLEncoded data component to raw binary data held in a string
  let byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataURI.split(',')[1]);
  } else {
    byteString = unescape(dataURI.split(',')[1]);
  }

  // separate out the mime component
  let mimeString = dataURI
    .split(',')[0]
    .split(':')[1]
    .split(';')[0];

  // write the bytes of the string to a typed array
  let ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], { type: mimeString });
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
