// Consent notice shown before the exam. Bump CONSENT_VERSION on the exam
// (aiProctoring.consentVersion) when this wording changes materially so candidates re-consent.
export const CONSENT_POINTS = [
  { title: 'What is checked', body: 'While the exam is open, your browser uses your webcam to check whether one face is visible and roughly which way your head is turned. It also notes when you leave the exam tab or window, exit full screen, or try to copy, cut or paste.' },
  { title: 'What is NOT done', body: 'No video or photos are recorded or uploaded. No audio is used. Your face is not identified or matched to anyone. The analysis runs on your own device.' },
  { title: 'What is sent', body: 'Only short event records such as "face not visible for 12 seconds at 10:42" are sent to the exam administrators, so they can review the session afterwards.' },
  { title: 'How it is used', body: 'These records are review indicators, not proof of misconduct. A person reviews them; nothing is decided automatically and your exam is never ended because of them. You can have an event reviewed or explained.' },
  { title: 'Your options', body: 'If you cannot or prefer not to use a camera (for example for accessibility, privacy or equipment reasons), you can request an alternative arrangement and the exam administrators will decide before you start.' },
  { title: 'Retention', body: 'Event records are kept only as long as the organisation\'s retention policy allows and are accessible only to authorised exam administrators.' },
];
