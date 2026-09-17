'use client';

import { useEffect } from 'react';

const LEADFOLLOW_DATE_INPUTS = [
  'input[aria-label="Next follow-up time"]',
  'input[aria-label="Selected lead follow-up time"]',
].join(', ');

function forceEnglishDateTimeInputs() {
  document.querySelectorAll<HTMLInputElement>(LEADFOLLOW_DATE_INPUTS).forEach((input) => {
    // Native datetime-local rendering follows the browser/OS locale in Chromium,
    // even when lang="en" is present. Use the same normalized value as a text
    // field so the visible format is stable and always Latin/English.
    if (input.type !== 'text') input.type = 'text';
    input.lang = 'en-US';
    input.dir = 'ltr';
    input.inputMode = 'numeric';
    input.placeholder = 'YYYY-MM-DDTHH:mm';
    input.autocomplete = 'off';
    input.pattern = '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}';
    input.title = 'Use YYYY-MM-DDTHH:mm, for example 2026-09-18T09:30';
    input.dataset.englishDatetime = 'true';
  });
}

export default function LeadFollowEnglishDateTimeInputs() {
  useEffect(() => {
    forceEnglishDateTimeInputs();

    const observer = new MutationObserver(() => forceEnglishDateTimeInputs());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
