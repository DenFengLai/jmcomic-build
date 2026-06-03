import fs from "fs"
import path from "path"
import { execSync } from "child_process"

const VERSION = process.env.VERSION
const ASSETS_DIR = process.env.RELEASE_ASSETS_DIR || "release-assets"
const IMG2PDF = process.env.IMG2PDF === "true"
const IMG2PDF_SUFFIX = process.env.IMG2PDF_SUFFIX || "img2pdf"
const IMG2PD_TAG = process.env.NPM_TAG || "img2pd"

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
  // {
  //   id: "linux-musl",
  //   os: "linux",
  //   cpu: "x64"
  // },
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
function findBinary(cli, platformId, variant = "normal") {
  const files = fs.readdirSync(ASSETS_DIR)

  const match = files.find(file => {
    if (!file.includes(cli) || !file.includes(platformId)) {
      return false
    }

    const isImg2pdf = file.includes(IMG2PDF_SUFFIX)
    return variant === "img2pdf" ? isImg2pdf : !isImg2pdf
  })

  if (!match) {
    throw new Error(`Missing binary: ${cli} - ${platformId} (${variant})`)
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
function writePackageJson(dir, name, platform, cli, version) {
  const binName = getBinaryName(cli, platform)

  const pkg = {
    name,
    version,
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

async function syncNpmMirror(name) {
  const url = `https://registry-direct.npmmirror.com/-/package/${encodeURIComponent(name)}/syncs`
  console.log(`Requesting npm mirror sync for ${name}`)

  const res = await fetch(url, { method: "PUT" })
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Mirror sync failed for ${name}: ${res.status} ${res.statusText} ${text}`)
  }

  console.log(`Mirror sync requested for ${name}: ${res.status} ${res.statusText}`)
}

async function publish(dir, name, tag = "") {
  const publishArgs = ["npm", "publish", "--access", "public"]
  if (tag) {
    publishArgs.push("--tag", tag)
  }

  console.log(`Publishing ${name}${tag ? ` with tag ${tag}` : ""}`)
  execSync(publishArgs.join(" "), {
    cwd: dir,
    stdio: "inherit"
  })

  try {
    await syncNpmMirror(name)
  } catch (error) {
    console.warn(`Mirror sync failed for ${name}: ${error.message}`)
  }
}

// =========================
// 主流程
// =========================

async function main() {
  ensure(OUT_DIR)

  for (const cli of CLIS) {
    for (const p of PLATFORMS) {
      const pkgName = `@jmcomic/${cli.name}-${p.id}`
      const outDir = path.join(OUT_DIR, `${cli.name}-${p.id}`)
      const binDir = path.join(outDir, "bin")

      ensure(binDir)

      const src = findBinary(cli.name, p.id, "normal")
      const binName = getBinaryName(cli, p)
      const dst = path.join(binDir, binName)

      fs.copyFileSync(src, dst)
      writeIndexJs(outDir, cli, p)
      writePackageJson(outDir, pkgName, p, cli, VERSION)

      console.log(`Built ${pkgName}`)
      await publish(outDir, pkgName)

      if (IMG2PDF && cli.name === "jmcomic") {
        const variantDir = path.join(OUT_DIR, `${cli.name}-${p.id}-${IMG2PDF_SUFFIX}`)
        const variantBinDir = path.join(variantDir, "bin")
        ensure(variantBinDir)

        const variantSrc = findBinary(cli.name, p.id, "img2pdf")
        const variantDst = path.join(variantBinDir, binName)
        fs.copyFileSync(variantSrc, variantDst)

        writeIndexJs(variantDir, cli, p)
        writePackageJson(variantDir, pkgName, p, cli, `${VERSION}-${IMG2PDF_SUFFIX}`)

        console.log(`Built ${pkgName} (${IMG2PDF_SUFFIX})`)
        await publish(variantDir, pkgName, IMG2PD_TAG)
      }
    }
  }

  console.log("All packages published")
}

await main()