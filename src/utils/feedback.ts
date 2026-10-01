import { getFeedback } from '@sentry/react';
import { type Translate } from '@/i18n';

// Anonymous Sentry feedback (ROADMAP items 21 and 23). Available only when Sentry is
// set up (VITE_SENTRY_DSN); the panel link and the top-left button share this.
export const isFeedbackAvailable = (): boolean => Boolean(getFeedback());

// The form texts come in the UI language (ROADMAP item 67).
export const openFeedbackForm = async (t: Translate): Promise<void> => {
  const error = t('feedback.error');
  const form = await getFeedback()?.createForm({
    formTitle: t('feedback.send'),
    messageLabel: t('feedback.messageLabel'),
    messagePlaceholder: t('feedback.messagePlaceholder'),
    isRequiredLabel: t('feedback.required'),
    submitButtonLabel: t('feedback.submit'),
    cancelButtonLabel: t('common.cancel'),
    successMessageText: t('feedback.success'),
    errorEmptyMessageText: t('feedback.emptyError'),
    errorGenericText: error,
    errorTimeoutText: error,
    errorForbiddenText: error,
    errorNoClientText: error,
  });
  form?.appendToDom();
  form?.open();
};
