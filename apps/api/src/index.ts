import { createApp } from './app';
import { loadEnv } from './config/env';

// Server entry. (For dev, `npm -w @ingame/api run dev` runs this under tsx with watch.)
const env = loadEnv();
const app = createApp();
app.listen(env.port, () => {
  console.log(`InGame API listening on http://localhost:${env.port}/api`);
});
