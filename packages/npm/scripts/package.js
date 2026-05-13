import fs from "fs"
import path from "path"
import { execSync } from "child_process"

const VERSION = process.env.VERSION
const ASSETS_DIR = process.env.RELEASE_ASSETS_DIR || "release-assets"

// 你的 npm scope
const SCOPE = "@kaguyajs"

// 平台映射（核心）
const platforms = [
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
    id: "windows-x86_64",
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

// 输出目录
const outDir = path.resolve("packages/npm")

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

// 找到对应 binary
function findBinary(platform, name) {
  const files = fs.readdirSync(ASSETS_DIR)

  const ext = platform.os === "win32" ? ".exe" : ""

  const match = files.find(f =>
    f.includes(name) &&
    f.includes(platform.id)
  )

  if (!match) {
    throw new Error(`missing binary: ${name} ${platform.id}`)
  }

  return path.join(ASSETS_DIR, match)
}

// 生成 package.json
function genPackageJson(pkgName, platform) {
  return {
    name: pkgName,
    version: VERSION,
    os: [platform.os],
    cpu: [platform.cpu],
    bin: {
      jmcomic: platform.os === "win32" ? "bin/jmcomic.exe" : "bin/jmcomic",
      jmv: platform.os === "win32" ? "bin/jmv.exe" : "bin/jmv",
    },
    files: ["bin"]
  }
}

// 发布 npm
function publish(pkgDir) {
  execSync("npm publish --access public", {
    cwd: pkgDir,
    stdio: "inherit"
  })
}

// 构建每个平台包
for (const p of platforms) {
  const pkgName = `${SCOPE}/jmcomic-${p.id}`
  const jmvPkgName = `${SCOPE}/jmv-${p.id}`

  const jmDir = path.join(outDir, `jmcomic-${p.id}`)
  const jmvDir = path.join(outDir, `jmv-${p.id}`)

  ensure(path.join(jmDir, "bin"))
  ensure(path.join(jmvDir, "bin"))

  // 拷贝 binary
  const jmBinary = findBinary(p, "jmcomic")
  const jmvBinary = findBinary(p, "jmv")

  fs.copyFileSync(
    jmBinary,
    path.join(jmDir, p.os === "win32" ? "bin/jmcomic.exe" : "bin/jmcomic")
  )

  fs.copyFileSync(
    jmvBinary,
    path.join(jmvDir, p.os === "win32" ? "bin/jmv.exe" : "bin/jmv")
  )

  // 写 package.json
  fs.writeFileSync(
    path.join(jmDir, "package.json"),
    JSON.stringify(genPackageJson(pkgName, p), null, 2)
  )

  fs.writeFileSync(
    path.join(jmvDir, "package.json"),
    JSON.stringify(genPackageJson(jmvPkgName, p), null, 2)
  )

  console.log("publishing:", pkgName)
  publish(jmDir)

  console.log("publishing:", jmvPkgName)
  publish(jmvDir)
}