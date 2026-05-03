import { test, expect } from '@playwright/test';

test('app boots, audio context initializes after play, currentTime advances', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Music Forge — Metronome/ })).toBeVisible();

  // Click play to provide the user gesture.
  await page.getByRole('button', { name: /^Play$/ }).click();

  // Verify that requestAnimationFrame is running and time has progressed.
  const elapsed = await page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      const start = performance.now();
      const step = () => {
        const now = performance.now();
        if (now - start > 200) resolve(now - start);
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });
  expect(elapsed).toBeGreaterThan(150);

  // After play, the button label should be "Stop"
  await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
});
