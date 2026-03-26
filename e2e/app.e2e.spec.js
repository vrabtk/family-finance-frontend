import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleImportPath = path.join(__dirname, 'fixtures', 'sample-import.json');
const password = 'Password123!';

const uniqueEmail = (prefix) => `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

async function signup(page, { name, email, password: userPassword }) {
  await page.goto('/signup');
  await page.locator('input[placeholder="Hari"]').fill(name);
  await page.locator('input[placeholder="you@example.com"]').fill(email);
  await page.locator('input[placeholder="••••••••"]').fill(userPassword);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/expenses$/);
}

async function login(page, { email, password: userPassword }) {
  await page.goto('/login');
  await page.locator('input[placeholder="you@example.com"]').fill(email);
  await page.locator('input[placeholder="••••••••"]').fill(userPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/expenses$/);
}

async function importSample(page) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /import json/i }).click(),
  ]);
  await fileChooser.setFiles(sampleImportPath);
  await expect(page.getByRole('button', { name: /year - 2026/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /mar-2026/i })).toBeVisible();
}

test('covers the core frontend modules from signup through imported finance data', async ({ page }) => {
  const user = {
    name: 'E2E Primary',
    email: uniqueEmail('primary'),
    password,
  };

  await signup(page, user);
  await importSample(page);

  await expect(page.locator('input[value="Hema"]')).toBeVisible();
  await expect(page.locator('input[value="Hari"]')).toBeVisible();
  await expect(page.locator('input[value="Rent"]')).toBeVisible();
  await expect(page.locator('input[value="Laptop EMI"]')).toBeVisible();
  await expect(page.locator('input[value="Aditya"]')).toBeVisible();
  await expect(page.getByText('₹22,500', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /loans/i }).click();
  await expect(page).toHaveURL(/\/loans$/);
  await expect(page.getByText('Home Loan')).toBeVisible();

  await page.getByRole('button', { name: /investments/i }).click();
  await expect(page).toHaveURL(/\/investments$/);
  await expect(page.getByText('Family Gold')).toBeVisible();

  await page.getByRole('button', { name: /insurance/i }).click();
  await expect(page).toHaveURL(/\/insurance$/);
  await expect(page.getByText('Star Health Family Floater')).toBeVisible();

  await page.getByRole('button', { name: /overview/i }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await page.getByRole('button', { name: /\+ add source/i }).click();
  await page.locator('input[placeholder*="Hema Salary"]').fill('Freelance Income');
  await page.locator('input[placeholder="0"]').fill('12000');
  await page.locator('input[placeholder="Hema, Hari, Joint…"]').fill('Joint');
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByText('Freelance Income')).toBeVisible();

  await page.getByRole('button', { name: /banks/i }).click();
  await expect(page).toHaveURL(/\/banks$/);
  await page.getByRole('button', { name: /\+ add bank/i }).click();
  await page.locator('input[placeholder="e.g. SBI, HDFC, ICICI"]').fill('Test Bank');
  await page.getByRole('button', { name: /add bank/i }).last().click();
  await expect(page.getByText('Test Bank', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /\+ section/i }).click();
  await page.locator('input[placeholder*="Savings, FD, RD"]').fill('Savings');
  await page.getByRole('button', { name: /add section/i }).click();
  await expect(page.getByText('Savings', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /^\+ add$/i }).click();
  await page.locator('input[placeholder*="Emergency fund"]').fill('Emergency Fund');
  await page.locator('input[placeholder="0"]').fill('5000');
  await page.locator('input[placeholder*="Account no."]').fill('E2E entry');
  await page.getByRole('button', { name: /add entry/i }).click();
  await expect(page.getByText('Emergency Fund', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /analytics/i }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByText('Monthly Spending')).toBeVisible();
  await expect(page.getByText('₹22,500', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /yearly/i }).click();
  await expect(page.getByText('Yearly Comparison')).toBeVisible();
});

test('covers the settings invite flow between two real users', async ({ browser }) => {
  const primaryUser = {
    name: 'Invite Owner',
    email: uniqueEmail('owner'),
    password,
  };
  const invitedUser = {
    name: 'Invite Member',
    email: uniqueEmail('member'),
    password,
  };

  const primaryContext = await browser.newContext();
  const invitedContext = await browser.newContext();
  const primaryPage = await primaryContext.newPage();
  const invitedPage = await invitedContext.newPage();

  await signup(primaryPage, primaryUser);
  await signup(invitedPage, invitedUser);

  await primaryPage.getByRole('button', { name: /account menu/i }).click();
  await primaryPage.getByRole('button', { name: /settings/i }).click();
  await expect(primaryPage).toHaveURL(/\/settings$/);

  await primaryPage.locator('input[placeholder="colleague@example.com"]').fill(invitedUser.email);
  await primaryPage.getByRole('button', { name: /send invite/i }).click();
  await expect(primaryPage.locator('input[placeholder="colleague@example.com"]')).toHaveValue('');

  await invitedPage.getByRole('button', { name: /account menu/i }).click();
  await invitedPage.getByRole('button', { name: /sign out/i }).click();
  await expect(invitedPage).toHaveURL(/\/login$/);

  await login(invitedPage, invitedUser);
  const workspaceSelector = invitedPage.locator('header select');
  await expect(workspaceSelector).toBeVisible();
  const workspaceOptions = await workspaceSelector.locator('option').allTextContents();
  expect(workspaceOptions).toContain(`${invitedUser.name}'s Workspace`);
  expect(workspaceOptions).toContain(`${primaryUser.name}'s Workspace`);

  await primaryContext.close();
  await invitedContext.close();
});

test('analytics ignores archived expense years', async ({ page }) => {
  const user = {
    name: 'Archive Check',
    email: uniqueEmail('archive'),
    password,
  };

  await signup(page, user);
  await importSample(page);

  await page.getByRole('button', { name: /archive year/i }).click();
  await expect(page.getByRole('button', { name: /year - 2026/i })).toHaveCount(0);

  await page.getByRole('button', { name: /analytics/i }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByText('Total Spent (All Time)')).toBeVisible();
  await expect(page.getByText('₹0', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /yearly/i }).click();
  await expect(page.getByText('Year - 2026')).toHaveCount(0);
});
