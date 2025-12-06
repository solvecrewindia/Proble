import { test, expect } from '@playwright/test';

test('full faculty flow', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:5173/faculty/login');
    await page.fill('input[name="email"]', 'sarah@proble.edu');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/faculty');

    // 2. Create Quiz
    await page.click('text=Quizzes');
    await page.click('text=Create New Quiz');
    await page.fill('input[placeholder="Quiz Title"]', 'E2E Test Quiz');
    await page.click('text=Next Step'); // To Questions
    await page.click('text=Add Question');
    await page.fill('input[placeholder="Question Text"]', 'What is 2+2?');
    await page.click('text=Next Step'); // To Import
    await page.click('text=Next Step'); // To Preview
    await page.click('text=Next Step'); // To Schedule

    // 3. Schedule
    await page.fill('input[placeholder="e.g. 60"]', '30');
    await page.click('text=Generate');
    await page.click('text=Publish Quiz');

    // 4. Monitor
    await page.click('text=Monitor');
    await expect(page.locator('h1')).toContainText('Live Monitor');
});
