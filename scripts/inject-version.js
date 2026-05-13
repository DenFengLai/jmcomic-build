import fs from "fs"
import path from "path"

const version = process.env.VERSION

if (!version) {
  throw new Error("VERSION is required")
}

const pkgPath = path.resolve("packages/jmcomic/package.json")

const raw = fs.readFileSync(pkgPath, "utf-8")

// 关键：字符串替换 __VERSION__
const replaced = raw.replaceAll("__VERSION__", version)

const pkg = JSON.parse(replaced)

// 可选：防止漏替换
if (pkg.version === "__VERSION__") {
  throw new Error("version not replaced correctly")
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

console.log(`[version] injected: ${version}`)