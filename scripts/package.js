import fs from "fs"
import path from "path"
import { execSync } from "child_process"

const VERSION = process.env.VERSION
const ASSETS_DIR = process.env.RELEASE_ASSETS_DIR || "release-assets"

const OUT_DIR = path.resolve("packages/npm")

// =========================
// CLI 定义（关键：分开 jmcomic / jmv）
// =========================
const CLIS = [
  {
    name: "jmcomic",
    bin: "jmcomic",
  },
  {
    name: "jmv",
    bin: "jmv",
  },
]

// =========================
// 平台定义
// =========================
const PLATFORMS = [
  {
    id: "linux-gnu",
    os: "linux",
    cpu: "x64",
  },
  {
    id: "linux-musl",
    os: "linux",
    cpu: "x64",
  },
  {
    id: "windows-x64",
    os: "win32",
    cpu: "x64",
    ext: ".exe",
  },
  {
    id: "macos-arm64",
    os: "darwin",
    cpu: "arm64",
  },
]

// =========================
// 工具函数
// =========================
function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

// 找 binary（基于你 CI artifact 命名规则）
function findBinary(cli, platformId) {
  const files = fs.readdirSync(ASSETS_DIR)

  const match = files.find(f =>
    f.includes(cli) &&
    f.includes(platformId)
  )

  if (!match) {
    throw new Error(`❌ Missing binary: ${cli} - ${platformId}`)
  }

  return path.join(ASSETS_DIR, match)
}

// 写 package.json
function writePackageJson(dir, name, platform, cli) {
  const pkg = {
    name,
    version: VERSION,
    os: [platform.os],
    cpu: [platform.cpu],
    bin: {
      [cli.bin]: `bin/${cli.bin}${platform.os === "win32" ? ".exe" : ""}`
    },
    files: ["bin"],
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
  console.log(`🚀 publishing ${name}`)
  execSync("npm publish --access public", {
    cwd: dir,
    stdio: "inherit",
    // env: {
    //   ...process.env
    // }
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

    // 找到对应 binary
    const src = findBinary(cli.name, p.id)

    const binName = p.os === "win32"
      ? `${cli.bin}.exe`
      : cli.bin

    const dst = path.join(binDir, binName)

    fs.copyFileSync(src, dst)

    // 写 package.json
    writePackageJson(outDir, pkgName, p, cli)

    console.log(`📦 built ${pkgName}`)

    // 发布
    publish(outDir, pkgName)
  }
}

console.log("🎉 all packages published")