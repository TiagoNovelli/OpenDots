import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { PushService, pushMessage } from '../src/server/push.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
});
function database() {
  const dir = mkdtempSync(join(tmpdir(), 'opendots-push-'));
  dirs.push(dir);
  return join(dir, 'test.sqlite');
}
const subscription = (endpoint: string) => ({
  endpoint,
  keys: { p256dh: 'p256dh-fixture', auth: 'auth-fixture' },
});

it('keeps its VAPID keys across restarts', () => {
  const path = database();
  const first = new PushService(path, 'https://dot.example.com');
  const key = first.publicKey();
  first.close();
  const second = new PushService(path, 'https://dot.example.com');
  expect(second.publicKey()).toBe(key);
  second.close();
});

it('notifies each device in the language it subscribed with', async () => {
  const send = vi.fn().mockResolvedValue({});
  const push = new PushService(database(), 'https://dot.example.com', send);
  push.subscribe(subscription('https://push.example.com/a'), 'pt-BR');
  push.subscribe(subscription('https://push.example.com/b'), 'en');
  // Subscribing again updates the device instead of adding another.
  push.subscribe(subscription('https://push.example.com/b'), 'en');
  expect(push.count()).toBe(2);
  await push.notify({
    kind: 'approval_requested',
    dot: 'Dot',
    action: 'GitHub · Create issue',
  });
  const payloads = send.mock.calls.map(([target, body, options]) => ({
    endpoint: target.endpoint,
    body: JSON.parse(body),
    subject: options.vapidDetails.subject,
  }));
  expect(payloads).toEqual(
    expect.arrayContaining([
      {
        endpoint: 'https://push.example.com/a',
        body: {
          title: 'Dot precisa da sua aprovação',
          body: 'GitHub · Create issue',
          tag: 'approval_requested',
          url: '/',
        },
        subject: 'https://dot.example.com',
      },
      expect.objectContaining({
        endpoint: 'https://push.example.com/b',
        body: expect.objectContaining({ title: 'Dot needs your approval' }),
      }),
    ]),
  );
  push.close();
});

it('forgets devices the push service no longer knows', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const send = vi
    .fn()
    .mockRejectedValueOnce(
      Object.assign(new Error('gone'), { statusCode: 410 }),
    )
    .mockRejectedValueOnce(
      Object.assign(new Error('busy'), { statusCode: 503 }),
    );
  const push = new PushService(database(), 'https://dot.example.com', send);
  push.subscribe(subscription('https://push.example.com/gone'), 'en');
  push.subscribe(subscription('https://push.example.com/busy'), 'en');
  await expect(push.notify({ kind: 'test' })).resolves.toBeUndefined();
  expect(push.count()).toBe(1);
  // A temporary failure is logged without the endpoint or payload.
  expect(error).toHaveBeenCalledWith('Push notification failed (503).');
  push.unsubscribe('https://push.example.com/busy');
  expect(push.count()).toBe(0);
  push.close();
});

it('keeps notification text short and in the chosen language', () => {
  expect(
    pushMessage({ kind: 'task_finished', prompt: 'x'.repeat(400) }, 'pt-BR'),
  ).toEqual({
    title: 'Tarefa concluída',
    body: 'x'.repeat(180),
    tag: 'task_finished',
    url: '/',
  });
  expect(
    pushMessage({ kind: 'task_failed', prompt: 'Weekly report' }, 'en'),
  ).toMatchObject({ title: 'Task needs attention', body: 'Weekly report' });
});
