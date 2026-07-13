import { createApp } from "../backend/src/app.js";

// createApp() returns a plain Express app (no .listen() call - that's in
// backend/src/server.ts for local dev only). Express apps are valid
// (req, res) => void handlers, which is exactly what Vercel's Node
// runtime expects, so exporting it directly works without extra
// adapter packages.
const app = createApp();

export default app;
