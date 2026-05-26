import fs from "fs"
import path from "path"
import { execSync } from "child_process"

const VERSION = process.env.VERSION
const ASSETS_DIR = process.env.RELEASE_ASSETS_DIR || "release-assets"

const OUT_DIR = path.resolve("packages/npm")

// =========================
// CLI 定义
// =========================
const CLIS = [
  {
    name: "jmcomic",
    bin: "jmcomic"
  },
  {
    name: "jmv",
    bin: "jmv"
  }
]

// =========================
// 平台定义
// =========================
const PLATFORMS = [
  {
    id: "linux-gnu",
    os: "linux",
    cpu: "x64"
  },
  {
    id: "linux-musl",
    os: "linux",
    cpu: "x64"
  },
  {
    id: "windows-x64",
    os: "win32",
    cpu: "x64",
    ext: ".exe"
  },
  {
    id: "macos-arm64",
    os: "darwin",
    cpu: "arm64"
  }
]

// =========================
// 工具函数
// =========================
function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function getBinaryName(cli, platform) {
  return platform.os === "win32" ? `${cli.bin}.exe` : cli.bin
}

// 找 binary（基于 CI artifact 命名规则）
function findBinary(cli, platformId) {
  const files = fs.readdirSync(ASSETS_DIR)

  const match = files.find(f =>
    f.includes(cli) &&
    f.includes(platformId)
  )

  if (!match) {
    throw new Error(`Missing binary: ${cli} - ${platformId}`)
  }

  return path.join(ASSETS_DIR, match)
}

// 写 index.js
function writeIndexJs(dir, cli, platform) {
  const binName = getBinaryName(cli, platform)

  const content = `const path = require("path")

const binary = path.join(__dirname, "bin", ${JSON.stringify(binName)})

function getBinaryPath() {
  return binary
}

module.exports = binary
module.exports.default = binary
module.exports.binary = binary
module.exports.getBinaryPath = getBinaryPath
`

  fs.writeFileSync(path.join(dir, "index.js"), content)
}

// 写 package.json
function writePackageJson(dir, name, platform, cli) {
  const binName = getBinaryName(cli, platform)

  const pkg = {
    name,
    version: VERSION,
    os: [platform.os],
    cpu: [platform.cpu],
    main: "./index.js",
    exports: {
      ".": "./index.js",
      "./bin/*": "./bin/*"
    },
    bin: {
      [cli.bin]: `./bin/${binName}`
    },
    files: ["bin", "index.js"],
    publishConfig: {
      access: "public"
    }
  }

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(pkg, null, 2)
  )
}

// publish
function publish(dir, name) {
  console.log(`Publishing ${name}`)
  execSync("npm publish --access public", {
    cwd: dir,
    stdio: "inherit"
  })
}

// =========================
// 主流程
// =========================
ensure(OUT_DIR)

for (const cli of CLIS) {
  for (const p of PLATFORMS) {
    const pkgName = `@jmcomic/${cli.name}-${p.id}`
    const outDir = path.join(OUT_DIR, `${cli.name}-${p.id}`)
    const binDir = path.join(outDir, "bin")

    ensure(binDir)

    const src = findBinary(cli.name, p.id)
    const binName = getBinaryName(cli, p)
    const dst = path.join(binDir, binName)

    fs.copyFileSync(src, dst)

    writeIndexJs(outDir, cli, p)
    writePackageJson(outDir, pkgName, p, cli)

    console.log(`Built ${pkgName}`)

    publish(outDir, pkgName)
  }
}

console.log("All packages published")