import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

test('Firestore rules secure connection requests by ownership and status', () => {
  assert.match(rules, /match \/connectionRequests\/\{requestId\}/);
  assert.match(rules, /request\.resource\.data\.senderId == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.recipientId != request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.status == 'PENDING'/);
  assert.match(rules, /resource\.data\.recipientId == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.status in \['ACCEPTED', 'DECLINED'\]/);
  assert.match(rules, /resource\.data\.senderId == request\.auth\.uid[\s\S]{0,400}request\.resource\.data\.status == 'CANCELLED'/);
});

test('Firestore rules secure mentorship requests with message validation and role authorization', () => {
  assert.match(rules, /match \/mentorshipRequests\/\{requestId\}/);
  assert.match(rules, /request\.resource\.data\.studentId == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.mentorId != request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.message\.size\(\) >= 10/);
  assert.match(rules, /resource\.data\.mentorId == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.status in \['ACCEPTED', 'DECLINED', 'COMPLETED'\]/);
  assert.match(rules, /resource\.data\.studentId == request\.auth\.uid[\s\S]{0,400}request\.resource\.data\.status == 'CANCELLED'/);
});

test('Firestore rules permit networking and mentorship notification dispatches', () => {
  assert.match(rules, /request\.resource\.data\.type in \['CONNECTION', 'MENTORSHIP'\]/);
});

test('Server API enforces authentication, duplicate prevention, and self-connection guards', () => {
  assert.match(server, /app\.post\('\/api\/connections\/request'/);
  assert.match(server, /You cannot send a connection request to yourself/);
  assert.match(server, /A connection request between you and this member is already pending/);
  assert.match(server, /You are already connected with this member/);
  assert.match(server, /checkNetworkingRateLimit/);
});

test('Server API strictly authorizes connection responses and cancellations', () => {
  assert.match(server, /app\.post\('\/api\/connections\/:id\/respond'/);
  assert.match(server, /Unauthorized: only the recipient may accept or decline this request/);
  assert.match(server, /app\.post\('\/api\/connections\/:id\/cancel'/);
  assert.match(server, /Unauthorized: only the sender may cancel this request/);
  assert.match(server, /app\.post\('\/api\/connections\/:id\/disconnect'/);
  assert.match(server, /Unauthorized: you are not a party to this connection/);
});

test('Server API validates mentorship requests with message minimums and prevents duplicates', () => {
  assert.match(server, /app\.post\('\/api\/mentorship\/request'/);
  assert.match(server, /You cannot request mentorship from yourself/);
  assert.match(server, /Please provide a clear purpose or message of at least 20 characters/);
  assert.match(server, /You already have a pending mentorship request to this mentor/);
});

test('Server API enforces mentor response authorization and feedback recording', () => {
  assert.match(server, /app\.post\('\/api\/mentorship\/:id\/respond'/);
  assert.match(server, /Unauthorized: only the mentor may respond to this request/);
  assert.match(server, /app\.post\('\/api\/mentorship\/:id\/cancel'/);
  assert.match(server, /Unauthorized: only the student may cancel this request/);
  assert.match(server, /app\.post\('\/api\/mentorship\/:id\/complete'/);
  assert.match(server, /Unauthorized: you are not a party to this mentorship relationship/);
});
