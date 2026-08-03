const { expect, test } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Missed-call inbox' })).toBeVisible();
});

test('presents the business workflow and synthetic queue', async ({ page }) => {
  await expect(page.getByText('Safe demo mode')).toBeVisible();
  await expect(page.locator('[data-testid^="lead-lead_"]')).toHaveCount(3);
  await expect(page.getByText('Demo phone')).toBeVisible();
  await expect(page.getByText('No live SMS or telephony.')).toBeVisible();
});

test('runs the standard recovery path and records evidence', async ({ page }) => {
  await page.getByRole('button', { name: 'Simulate rescue SMS' }).click();
  await expect(page.getByTestId('lead-status')).toHaveText('contacted');

  await page.getByRole('button', { name: 'Capture reply' }).click();
  await expect(page.getByTestId('lead-status')).toHaveText('ready for dispatch');

  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByTestId('lead-status')).toHaveText('won');

  await page.getByRole('button', { name: 'Send review request' }).click();
  await expect(page.getByRole('button', { name: 'Review request sent' })).toBeDisabled();

  await page.getByRole('button', { name: /Audit trail/ }).click();
  await expect(page.getByTestId('audit-event')).toHaveCount(5);
  await expect(page.getByText('review request simulated', { exact: true })).toBeVisible();
});

test('routes legal-sensitive work through a human approval', async ({ page }) => {
  await page.getByTestId('lead-lead_eviction_flag_002').click();
  await page.getByRole('button', { name: 'Capture reply' }).click();
  await expect(page.getByTestId('lead-status')).toHaveText('needs approval');

  await page.getByRole('button', { name: /Approvals/ }).click();
  await expect(page.getByTestId('approval-lead_eviction_flag_002')).toBeVisible();
  await page.getByRole('button', { name: 'Approve simulated handoff' }).click();
  await expect(page.getByText('No human decisions are waiting.')).toBeVisible();

  await page.getByRole('button', { name: /Inbox/ }).click();
  await page.getByTestId('lead-lead_eviction_flag_002').click();
  await expect(page.getByTestId('lead-status')).toHaveText('scheduled');
});

test('enforces do-not-contact without an approval bypass', async ({ page }) => {
  await page.getByTestId('lead-lead_optout_003').click();
  await expect(page.getByTestId('lead-status')).toHaveText('do not contact');
  await expect(page.getByRole('button', { name: 'Simulate rescue SMS' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Capture reply' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Request approval' })).toBeDisabled();
});

test('does not overflow a narrow viewport', async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('loads every workspace view without browser or HTTP errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
  });

  await page.reload();
  for (const name of ['Approvals', 'Scripts', 'Audit trail', 'Controls', 'Inbox']) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
  }

  expect(errors).toEqual([]);
});
