import { DatabaseSync } from 'node:sqlite';
import webpush, { type PushSubscription } from 'web-push';
import { z } from 'zod';

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});
export type PushLocale = 'en' | 'pt-BR';
export type PushEvent =
  | { kind: 'task_finished' | 'task_failed'; prompt: string }
  | { kind: 'approval_requested'; dot: string; action: string }
  | { kind: 'test' };

// Notifications are composed on the server, so each subscription keeps the
// language its browser used when it subscribed.
const messages: Record<
  PushLocale,
  Record<PushEvent['kind'], (event: PushEvent) => [string, string]>
> = {
  en: {
    task_finished: (e) => ['Task finished', 'prompt' in e ? e.prompt : ''],
    task_failed: (e) => ['Task needs attention', 'prompt' in e ? e.prompt : ''],
    approval_requested: (e) =>
      'dot' in e ? [`${e.dot} needs your approval`, e.action] : ['', ''],
    test: () => [
      'Notifications are on',
      'This is how OpenDots will reach you.',
    ],
  },
  'pt-BR': {
    task_finished: (e) => ['Tarefa concluída', 'prompt' in e ? e.prompt : ''],
    task_failed: (e) => [
      'Tarefa precisa de atenção',
      'prompt' in e ? e.prompt : '',
    ],
    approval_requested: (e) =>
      'dot' in e ? [`${e.dot} precisa da sua aprovação`, e.action] : ['', ''],
    test: () => [
      'Notificações ativadas',
      'É assim que o OpenDots vai te avisar.',
    ],
  },
};
export function pushMessage(event: PushEvent, locale: PushLocale) {
  const [title, body] = messages[locale][event.kind](event);
  return { title, body: body.slice(0, 180), tag: event.kind, url: '/' };
}

type Send = typeof webpush.sendNotification;

export class PushService {
  private db: DatabaseSync;
  private keys: { publicKey: string; privateKey: string };
  constructor(
    path: string,
    // VAPID contact. Apple rejects placeholder hosts, so use the app's URL.
    private subject: string,
    private send: Send = webpush.sendNotification.bind(webpush),
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS push_keys (id INTEGER PRIMARY KEY CHECK(id=1), publicKey TEXT NOT NULL, privateKey TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, value TEXT NOT NULL, locale TEXT NOT NULL, createdAt INTEGER NOT NULL);`);
    // Generated once and kept: new keys would invalidate every subscription.
    const stored = this.db
      .prepare('SELECT publicKey, privateKey FROM push_keys WHERE id=1')
      .get() as { publicKey: string; privateKey: string } | undefined;
    this.keys = stored ?? webpush.generateVAPIDKeys();
    if (!stored)
      this.db
        .prepare('INSERT INTO push_keys VALUES (1, ?, ?)')
        .run(this.keys.publicKey, this.keys.privateKey);
  }
  close() {
    this.db.close();
  }
  publicKey() {
    return this.keys.publicKey;
  }
  count() {
    return (
      this.db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get() as {
        n: number;
      }
    ).n;
  }
  subscribe(subscription: PushSubscription, locale: PushLocale) {
    this.db
      .prepare(
        'INSERT INTO push_subscriptions VALUES (?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET value=excluded.value, locale=excluded.locale',
      )
      .run(
        subscription.endpoint,
        JSON.stringify(subscription),
        locale,
        Date.now(),
      );
  }
  unsubscribe(endpoint: string) {
    this.db
      .prepare('DELETE FROM push_subscriptions WHERE endpoint=?')
      .run(endpoint);
  }
  /** Sends to every device; never throws, since callers are finishing work. */
  async notify(event: PushEvent) {
    const rows = this.db
      .prepare('SELECT endpoint, value, locale FROM push_subscriptions')
      .all() as { endpoint: string; value: string; locale: PushLocale }[];
    await Promise.all(
      rows.map(async (row) => {
        try {
          await this.send(
            JSON.parse(row.value) as PushSubscription,
            JSON.stringify(pushMessage(event, row.locale)),
            {
              vapidDetails: { subject: this.subject, ...this.keys },
              TTL: 3600,
            },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // The browser dropped this subscription; stop sending to it.
          if (status === 404 || status === 410) this.unsubscribe(row.endpoint);
          // Do not log endpoints or payloads.
          else
            console.error(`Push notification failed (${status ?? 'network'}).`);
        }
      }),
    );
  }
}
