import React from 'react';
import { browser } from 'webextension-polyfill-ts';

export default function Message({ i18n }) {
  const text = browser.i18n.getMessage(i18n);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: text,
      }}
    />
  );
}
