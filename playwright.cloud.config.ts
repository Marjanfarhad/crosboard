import {defineConfig} from '@playwright/test';
import original from './playwright.config';
export default defineConfig({...original,testMatch:'**/cloud.*.spec.ts',webServer:{...original.webServer,url:'http://127.0.0.1:4173/'}});

