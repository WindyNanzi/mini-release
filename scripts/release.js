import { writeFileSync, readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
// 获取命令行参数
import minimist from "minimist"
// 语义化版本管理
import semver from "semver"
// 命令行彩色文字
import chalk from "chalk"
// 用于执行命令行
import { execa } from "execa"
// 用于命令行中和用户交互
import enquirer from "enquirer"


const { prompt } = enquirer
const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(dirname(__filename))


const { version: currentVersion } = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)
const args = minimist(process.argv.splice(2))
const isDryRun = args.dry
const preId = args.preId || (semver.prerelease(currentVersion) && semver.prerelease(currentVersion)[0])

const versionIncrements = ["patch", "minor", "major"]

const inc = (i) => semver.inc(currentVersion, i, preId)
const bin = (name) => resolve(__dirname, `../node_modules/.bin/${name}`)
const run = (bin, args, opts = {}) =>
  execa(bin, args, { stdio: "inherit", ...opts })
const dryRun = (bin, args, opts = {}) =>
  console.log(chalk.blue(`[dryrun] ${bin} ${args.join(" ")}`, opts))
const runIfNotDry = isDryRun ? dryRun : run
const packages = readdirSync(resolve(__dirname, '../packages'))
const getPkgRoot = pkg => resolve(__dirname, `../packages/${pkg}`)
const step = (msg) => console.log(chalk.bold.cyan(msg))


async function main() {
  let targetVersion = args._[0]

  step('🍊 验证版本号')
  if (!targetVersion) {
    const { release } = await prompt({
      type: "select",
      name: "release",
      message: "选择发布的版本号，patch 表示补丁版本， minor 表示次版本， major 表示主版本",
      choices: versionIncrements
        .map((i) => `${i} (${inc(i)})`)
        .concat(["custom"]),
    })
    if (release === "custom") {
      const { version } = await prompt({
        type: "input",
        name: "version",
        message: "请输入要发布的版本号",
        initial: currentVersion,
      })
      targetVersion = version
    } else {
      targetVersion = release.match(/\((.*)\)/)[1]
    }
  }

  if(!semver.valid(targetVersion)) {
    console.log(targetVersion)
    throw new Error(`无效的版本号: ${ targetVersion }`)
  }

  const { yes } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: `确定发布版本：${targetVersion}?`
  })

  if(!yes) {
    return
  }


  step('🍇 单元测试...')
  if(!isDryRun) {
    await run(bin('jest', ['--clearCache']))
    step('🍇 单元测试完成')
  }else{
    step('🍉 跳过')
  }

  step('🍈 更新包版本号与内部依赖版本号...')
  if(!isDryRun) {
    updateVersions(targetVersion)
    step('🍈 更新版本号完成')
  }else{
    step('🍉 跳过')
  }

  step('🍋 打包...')
  await run('yarn', ['build'])

  step('🍍 生成 changelog...')
  await run('yarn', ['changelog'])
  step('🍍 生成 changelog 完成')

  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })
  if(stdout) {
    step('🥭 提交 git 更改')
    await runIfNotDry('git', ['add', '-A'])
    await runIfNotDry('git', ['commit', '-m', `release: v${targetVersion}`])
  }else {
    console.log('没有文件更改')
  }

  step('🍎 发布包')
  if(!isDryRun) {
    console.log(
      chalk.bold.cyan('🍎 发布包需要发布到npm上，暂不处理')
    )
  }else {
    step('🍉 跳过')
  }

  step('🍑 打tag...')
  await runIfNotDry('git', ['tag', `v${targetVersion}`])
  step('🍑 tag打完，推送tag分支到远程...')
  await runIfNotDry('git', ['push', 'origin', `refs/tags/v${targetVersion}`])
  step('🍑 推送 tag 分支完成')
  step('🍐 推送代码到github...')
  await runIfNotDry('git', ['push'])
  step('🍐 推送完成！')

  if(isDryRun) {
    console.log(
      chalk.bold.yellow('✌ 干跑完成！耶~')
    )
  }
}


function updateVersions(version) {
  updatePackage(resolve(__dirname, '..'), version)
  packages.forEach(p => updatePackage(getPkgRoot(p), version))
}

/**
 * 更新 package.json
 * @param {string} pkgRoot 要更新的 package.json 所在文件夹路径
 * @param {string} version 要更新的版本
 */
function updatePackage(pkgRoot, version) {
  const pkgPath = resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  pkg.version = version
  updateDeps(pkg, 'dependencies', version)
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

/**
 * 更新 package.json 中的每个内部包依赖的版本
 * @param {Object} pkg package.json 对象 
 * @param {string} depType 依赖类型 dependencies || peerDependencies
 * @param {string} version 版本
 * @returns 
 */
function updateDeps(pkg, depType, version) {
  const deps = pkg[depType]
  if(!deps) return
  Object.keys(deps).forEach(dep => {
    // 以 @mini-release 开头且在项目 packages 目录下的包
    if(
      dep.startsWith('@mini-release') && 
      packages.includes(dep.replace(/^@mini-release\//, ''))
    ) {
      console.log(
        chalk.bold.yellow(`${pkg.name} -> ${depType} -> ${dep}@${version}`)
      )
      deps[dep] = version
    }
  })
}

main().catch((err) => console.error(err))