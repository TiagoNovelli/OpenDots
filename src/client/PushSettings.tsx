import { useEffect, useState } from 'react';
import { api } from './api';
import { currentLocale, t } from './i18n';

type Status = 'checking' | 'unsupported' | 'denied' | 'off' | 'on';
// iOS exposes push only to an app opened from its Home Screen icon.
const supported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;
function keyBytes(base64url: string) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function PushSettings() {
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supported()) return setStatus('unsupported');
    if (Notification.permission === 'denied') return setStatus('denied');
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? 'on' : 'off'))
      .catch(() => setStatus('off'));
  }, []);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await task();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? t(error.message)
          : t('Could not change notifications.'),
      );
    } finally {
      setBusy(false);
    }
  };
  const enable = () =>
    run(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const { publicKey } = await api<{ publicKey: string }>('/push');
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey),
        }));
      await api('/push/subscriptions', 'POST', {
        subscription: subscription.toJSON(),
        locale: currentLocale(),
      });
      setStatus('on');
    });
  const disable = () =>
    run(async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api('/push/subscriptions', 'DELETE', {
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }
      setStatus('off');
    });
  const test = () =>
    run(async () => {
      await api('/push/test', 'POST');
      setMessage(t('Test sent. It should arrive in a few seconds.'));
    });
  return (
    <fieldset className="appearance-fields">
      <legend>{t('Phone notifications')}</legend>
      <p className="muted">
        {status === 'unsupported'
          ? t(
              'This browser cannot receive notifications. On iPhone, add OpenDots to the Home Screen and open it from there.',
            )
          : status === 'denied'
            ? t(
                'Notifications are blocked for this site. Allow them in the browser settings, then reload.',
              )
            : status === 'on'
              ? t('Notifications are on for this device.')
              : t(
                  'Get notified when a scheduled task finishes or a Dot needs your approval.',
                )}
      </p>
      {(status === 'off' || status === 'on') && (
        <div className="segmented">
          {status === 'off' ? (
            <button type="button" disabled={busy} onClick={() => void enable()}>
              {t('Turn on notifications')}
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => void test()}>
                {t('Send test')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void disable()}
              >
                {t('Turn off')}
              </button>
            </>
          )}
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </fieldset>
  );
}
