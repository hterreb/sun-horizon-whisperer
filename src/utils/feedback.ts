import { addIntegration, getClient } from '@sentry/react';
import { type Translate } from '@/i18n';

// Anonymous Sentry feedback (ROADMAP items 21 and 23). Available only when Sentry is
// set up (VITE_SENTRY_DSN); the panel link and the top-left button share this.
export const isFeedbackAvailable = (): boolean => Boolean(getClient());

// The feedback integration is not in the start bundle (ROADMAP item 125): it loads and
// registers on the first open. Imported from @sentry/feedback, not @sentry/react, so it
// gets its own chunk. Keep @sentry/feedback on the same version as @sentry/react, or it
// brings a second @sentry/core. A failed load is retried on the next open.
let feedbackLoad: Promise<ReturnType<ReturnType<typeof import('@sentry/feedback').buildFeedbackIntegration>>> | null = null;
const loadFeedback = () =>
  (feedbackLoad ??= import('@sentry/feedback').then(({ buildFeedbackIntegration, feedbackModalIntegration, feedbackScreenshotIntegration }) => {
    const feedback = buildFeedbackIntegration({
      getModalIntegration: () => feedbackModalIntegration,
      getScreenshotIntegration: () => feedbackScreenshotIntegration,
    })({
      autoInject: false, // opened from the InfoPanel, so no floating button over the scene
      showName: false,
      showEmail: false,
      isNameRequired: false,
      isEmailRequired: false,
      enableScreenshot: false, // a screenshot would show the location in the InfoPanel
      showBranding: false,
    });
    addIntegration(feedback);
    return feedback;
  }, (error) => {
    feedbackLoad = null;
    throw error;
  }));

// The form texts come in the UI language (ROADMAP item 67).
export const openFeedbackForm = async (t: Translate): Promise<void> => {
  const error = t('feedback.error');
  const form = await (await loadFeedback()).createForm({
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
