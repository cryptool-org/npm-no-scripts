import * as core from "@actions/core"
import { Arborist } from "@npmcli/arborist"
import { depth as traverse } from "treeverse"

import { analyze } from "./analyze"
import { shouldIgnoreFinding, shouldIgnorePackage } from "./ignore"
import { getIgnoreList, getIgnoreNative } from "./input"

async function run() {
  try {
    // Get list of packages to ignore from the input
    const ignoreList = getIgnoreList()
    const shouldIgnoreNative = getIgnoreNative()

    // Walk the node_modules/ folder to build a list of all installed dependencies
    core.debug("Load installed packages in node_modules/")
    const arb = new Arborist()
    const tree = await arb.loadActual()

    const nodes = []
    traverse({
      tree,
      leave: (node) => !node.isProjectRoot && nodes.push(node),
      getChildren: (node) =>
        node && node.target.children && node.target.children.values(),
    })

    // Analyze the package.json of all found dependencies
    core.info(`Analyzing ${nodes.length} packages in node_modules/`)
    const results = await analyze(nodes)

    // Aggregate all findings (and respect ignored packages)
    const ignored = new Set()
    const errors = []

    for (const [name, info] of results.entries()) {
      if (shouldIgnorePackage(ignoreList, info.node.target)) {
        ignored.add(name)
        continue
      }
      for (const f of info.findings) {
        if (shouldIgnoreFinding(ignoreList, info.node.target, f)) {
          ignored.add(name)
          continue
        }
        if (f.type === "NATIVE_BINDINGS" && shouldIgnoreNative) {
          ignored.add(name)
          continue
        }

        const version = info.node.target.version
        if (f.type === "NATIVE_BINDINGS") {
          errors.push(
            ` - Implicit build step for native bindings in ${name}@${version}: ${f.cmd}`
          )
        } else {
          errors.push(
            ` - Lifecycle script ${f.name} in ${name}@${version}: ${f.cmd}`
          )
        }
      }
    }

    // Set failure state when lifecycle scripts are found
    if (errors.length > 0) {
      core.setFailed(
        `\u001b[35mFound ${errors.length} dependencies with lifecycle scripts:\n${errors.join("\n")}\u001b[0m`
      )
    } else {
      if (ignored.size > 0)
        core.info(`Ignored lifecycle scripts in ${ignored.size} dependencies`)
      else core.info("No lifecycle scripts found")
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

process.on("log", (level, ...args) => {
  switch (level) {
    case "error":
      core.error(args.join(" "))
      break
    case "warn":
      core.warning(args.join(" "))
      break
    case "notice":
      core.notice(args.join(" "))
      break
    case "verbose": // fallthrough
    case "silly":
      core.debug(args.join(" "))
      break
    default:
      core.info(args.join(" "))
  }
})

run()
