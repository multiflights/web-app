import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox'],
});

const page = await browser.newPage();

for (const [label, vw] of [['Mobile 375', 375], ['Tablet 600', 600], ['Desktop 1280', 1280]]) {
  await page.setViewport({ width: vw, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.click('button:has(.lucide-calendar)');
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({ path: `./inspect-${vw}.png` });

  const m = await page.evaluate(() => {
    const trigger = document.querySelector('[data-slot="popover-trigger"]');
    const popup = document.querySelector('[data-slot="popover-content"]');
    const calendar = document.querySelector('[data-slot="calendar"]');
    const months = document.querySelectorAll('.rdp-month');
    const cell = document.querySelector('.rdp-weekday');
    const r = el => el?.getBoundingClientRect();
    return {
      trigger_w: r(trigger)?.width?.toFixed(1),
      popup_w: r(popup)?.width?.toFixed(1),
      calendar_w: r(calendar)?.width?.toFixed(1),
      num_months: months.length,
      cell_w: r(cell)?.width?.toFixed(1),
    };
  });

  console.log(`${label}:`, JSON.stringify(m));
}

await browser.close();
