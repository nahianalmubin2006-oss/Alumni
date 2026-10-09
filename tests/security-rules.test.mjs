import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

test('Firestore rules deny access by default', () => {
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

test('self-registration cannot create privileged or pre-approved profiles', () => {
  assert.match(rules, /request\.resource\.data\.role == 'STUDENT' && request\.resource\.data\.profileType == 'Student'/);
  assert.match(rules, /request\.resource\.data\.role == 'ALUMNI' && request\.resource\.data\.profileType == 'Alumni'/);
  assert.match(rules, /request\.resource\.data\.status == 'PENDING'/);
  assert.match(rules, /request\.resource\.data\.get\('assignedUniversity', ''\) == ''/);
});

test('institution admins cannot move alumni or student records outside their assigned scope', () => {
  assert.match(rules, /isDepartmentAdmin\(resource\.data\.university, resource\.data\.department\)[\s\S]{0,220}request\.resource\.data\.university == resource\.data\.university[\s\S]{0,250}request\.resource\.data\.department == resource\.data\.department/);
  assert.match(rules, /canManageDirectory\([\s\S]{0,120}request\.resource\.data\.university,\s*request\.resource\.data\.department/);
});

test('profile claims require an authenticated claimant and privileged review', () => {
  assert.match(rules, /match \/profileClaims\/\{claimId\}/);
  assert.match(rules, /request\.resource\.data\.requesterId == request\.auth\.uid/);
  assert.match(rules, /allow update: if isSuperAdmin\(\)[\s\S]{0,300}request\.resource\.data\.status in \['APPROVED', 'REJECTED'\]/);
  assert.match(rules, /match \/profileClaims\/\{claimId\}[\s\S]{0,4000}allow delete: if false;/);
});

test('audit records are immutable and created only by trusted Super Admins', () => {
  assert.match(rules, /match \/auditLogs\/\{logId\}[\s\S]{0,300}allow create: if isSuperAdmin\(\);[\s\S]{0,250}allow update, delete: if false;/);
});

test('API responses get baseline security headers and JSON body limits', () => {
  assert.match(server, /X-Content-Type-Options/);
  assert.match(server, /X-Frame-Options/);
  assert.match(server, /Cache-Control', 'no-store'/);
  assert.match(server, /express\.json\(\{ limit: '1mb' \}\)/);
});
