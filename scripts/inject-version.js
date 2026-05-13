import fs from "fs"
import path from "path"

const version = process.env.VERSION

if (!version) {
  throw new Error("VERSION is required")
}

const pkgPath = path.resolve("packages/jmcomic/package.json")

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))

// 替换 __VERSION__
pkg.version = version

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

console.log(`[version] injected: ${version}`)