import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/info/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve('output/video/assets');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.screenshot({path:path.join(output,'food-my-way-app.png'),fullPage:false});
await page.goto('http://127.0.0.1:4173/survival-kit.html',{waitUntil:'networkidle'});
await page.screenshot({path:path.join(output,'survival-kit-page.png'),fullPage:false});
await browser.close();
