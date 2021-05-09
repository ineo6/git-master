import React from 'react';
import { browser } from 'webextension-polyfill-ts';
import DOMPurify from 'dompurify';

export default function Message({ i18n }: { i18n: string }) {
  const text = browser.i18n.getMessage(i18n);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(text),
      }}
    />
  );
}
