import path from "path"
import { spawn, execFileSync } from "child_process"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

let cachedBinaryPath = null

/**
 * @typedef {Object} RunResult
 * @property {number|null} code 退出码
 * @property {NodeJS.Signals|null} signal 结束信号
 * @property {import("child_process").ChildProcess} child 子进程对象
 */

/**
 * 获取当前平台对应的 jmcomic 可执行文件路径
 *
 * @returns {string} 可执行文件绝对路径
 * @throws {Error} 当前平台不受支持
 */
export function getBinaryPath() {
  if (cachedBinaryPath) return cachedBinaryPath

  const platform = process.platform

  if (platform === "win32") {
    const p = require.resolve("@jmcomic/jmcomic-windows-x64")
    cachedBinaryPath = path.join(path.dirname(p), "bin/jmcomic.exe")
    return cachedBinaryPath
  }

  // if (platform === "linux") {
    // try {
      const p = require.resolve("@jmcomic/jmcomic-linux-gnu")
      cachedBinaryPath = path.join(path.dirname(p), "bin/jmcomic")
      return cachedBinaryPath
  //   } catch {
  //     const p = require.resolve("@jmcomic/jmcomic-linux-musl")
  //     cachedBinaryPath = path.join(path.dirname(p), "bin/jmcomic")
  //     return cachedBinaryPath
  //   }
  // }

  if (platform === "darwin") {
    const p = require.resolve("@jmcomic/jmcomic-macos-arm64")
    cachedBinaryPath = path.join(path.dirname(p), "bin/jmcomic")
    return cachedBinaryPath
  }

  throw new Error(`Unsupported platform: ${platform}`)
}

/**
 * 启动 jmcomic 进程
 *
 * 返回原始 ChildProcess 对象，
 * 可自行监听 stdout、stderr、close、exit、error 等事件。
 *
 * @param {string|string[]} input
 * 命令参数。
 *
 * 示例：
 * ```js
 * spawnProcess(["123456"])
 * spawnProcess("123456 --option=option.yml")
 * ```
 *
 * @param {import("child_process").SpawnOptions} [options]
 * spawn 配置项
 *
 * @returns {import("child_process").ChildProcess}
 */
export function spawnProcess(input, options = {}) {
  const args = Array.isArray(input)
    ? input
    : String(input).trim().split(/\s+/)

  return spawn(getBinaryPath(), args, {
    stdio: "inherit",
    ...options
  })
}

/**
 * 异步执行 jmcomic
 *
 * Promise 在退出码为 0 时 resolve，
 * 非 0 时 reject。
 *
 * @param {string|string[]} input
 * 命令参数
 *
 * @param {import("child_process").SpawnOptions} [options]
 * spawn 配置项
 *
 * @returns {Promise<RunResult>}
 *
 * @example
 * await run(["123456"])
 *
 * @example
 * await run([
 *   "123456",
 *   "--option=option.yml"
 * ])
 */
export function run(input, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(input, options)

    child.on("error", reject)

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve({
          code,
          signal,
          child
        })
        return
      }

      const err = new Error(
        `jmcomic exited with code ${code}`
      )

      err.code = code
      err.signal = signal

      reject(err)
    })
  })
}

/**
 * 同步执行 jmcomic
 *
 * 当前线程会被阻塞直到程序退出。
 *
 * @param {string|string[]} input
 * 命令参数
 *
 * @param {import("child_process").ExecFileSyncOptions} [options]
 * execFileSync 配置项
 *
 * @returns {Buffer|string}
 *
 * @example
 * runSync(["123456"])
 */
export function runSync(input, options = {}) {
  const args = Array.isArray(input)
    ? input
    : String(input).trim().split(/\s+/)

  return execFileSync(
    getBinaryPath(),
    args,
    {
      stdio: "inherit",
      ...options
    }
  )
}

/**
 * run 的别名
 *
 * @param {string|string[]} input
 * @param {import("child_process").SpawnOptions} [options]
 *
 * @returns {Promise<RunResult>}
 */
export function exec(input, options = {}) {
  return run(input, options)
}

/**
 * 默认导出
 *
 * 等价于：
 *
 * ```js
 * await run(...)
 * ```
 *
 * @param {string|string[]} input
 * @param {import("child_process").SpawnOptions} [options]
 *
 * @returns {Promise<RunResult>}
 */
export default function jmcomic(input, options = {}) {
  return run(input, options)
}

/**
 * 获取可执行文件路径
 */
jmcomic.getBinaryPath = getBinaryPath

/**
 * 启动子进程
 */
jmcomic.spawn = spawnProcess

/**
 * 异步执行
 */
jmcomic.run = run

/**
 * run 的别名
 */
jmcomic.exec = exec

/**
 * 同步执行
 */
jmcomic.runSync = runSync