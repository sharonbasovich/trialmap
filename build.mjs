import { mkdir, copyFile, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const f of ["index.html", "style.css", "app.mjs", "model.mjs", "checkpoint.mjs"])
  await copyFile(f, "dist/" + f);
console.log("Static build complete");

