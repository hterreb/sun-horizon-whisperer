import { getFeedback } from '@sentry/react';

// Anonymous Sentry feedback (ROADMAP items 21 and 23). Available only when Sentry is
// set up (VITE_SENTRY_DSN); the panel link and the top-left button share this.
export const isFeedbackAvailable = (): boolean => Boolean(getFeedback());

export const openFeedbackForm = async (): Promise<void> => {
  const form = await getFeedback()?.createForm();
  form?.appendToDom();
  form?.open();
};
