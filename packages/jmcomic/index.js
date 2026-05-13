import path from "path"
import { execFileSync } from "child_process"

// 找 binary
function getBinary() {
  const platform = process.platform

  if (platform === "win32") {
    const p = require.resolve("@kaguyajs/jmcomic-windows-x64")
    return path.join(path.dirname(p), "bin/jmcomic.exe")
  }

  if (platform === "linux") {
    try {
      const p = require.resolve("@kaguyajs/jmcomic-linux-gnu")
      return path.join(path.dirname(p), "bin/jmcomic")
    } catch {
      const p = require.resolve("@kaguyajs/jmcomic-linux-musl")
      return path.join(path.dirname(p), "bin/jmcomic")
    }
  }

  if (platform === "darwin") {
    const p = require.resolve("@kaguyajs/jmcomic-macos-arm64")
    return path.join(path.dirname(p), "bin/jmcomic")
  }

  throw new Error("Unsupported platform")
}

const bin = getBinary()

// 核心执行函数（API）
export function run(input) {
  const argv = Array.isArray(input)
    ? input
    : String(input || "").trim().split(/\s+/)

  execFileSync(bin, argv, {
    stdio: "inherit"
  })
}

// 给用户用的 API
export function jmcomic(input) {
  return run(input)
}

export default jmcomic