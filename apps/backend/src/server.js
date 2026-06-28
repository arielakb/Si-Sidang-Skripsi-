import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.server.port, () => {
  console.log(`${env.app.name} backend running on port ${env.server.port}`);
});