import fs from "node:fs";
import path from "node:path";

const hasRootAppDir = fs.existsSync(path.resolve("app"));
const hasSrcAppDir = fs.existsSync(path.resolve("src/app"));

console.log(
  "[next-config] route directories -> root app:",
  hasRootAppDir,
  "src/app:",
  hasSrcAppDir,
);

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
