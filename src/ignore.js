import * as core from "@actions/core"
import semverSatisfies from "semver/functions/satisfies"

function ignoreMessage(node) {
  return ` -- Ignore package ${node.name}@${node.version} in ${node.location}`
}

export function shouldIgnorePackage(ignoreList, node) {
  const { name, version } = node
  const opts = ignoreList.get(name)
  if (opts == null) return false

  // ignore the whole package
  if (opts === true) {
    core.info(ignoreMessage(node))
    return true
  }

  // cannot ignore the whole package when specific scripts to ignore are specified
  if (Object.hasOwn(opts, "scripts")) return false
  // cannot ignore the whole package when only the build step for native bindings is ignored
  if (Object.hasOwn(opts, "native")) return false

  // ignore if the specified version matches
  if (semverSatisfies(version, opts.version)) {
    core.info(ignoreMessage(node))
    return true
  }

  return false
}

export function shouldIgnoreFinding(ignoreList, node, finding) {
  const { name, version } = node
  const opts = ignoreList.get(name)
  if (opts == null) return false

  // ignore the whole package (should already be catched)
  if (opts === true) {
    core.info(ignoreMessage(node))
    return true
  }

  // check that the specified version matches first
  let ignoreVersion = !Object.hasOwn(opts, "version") // if not specified, we want to ignore *ALL* versions
  if (semverSatisfies(version, opts.version)) ignoreVersion = true

  // this version should not be ignored
  if (!ignoreVersion) return false

  if (finding.type === "NATIVE_BINDINGS") {
    // ignore if implicit build step for native bindings is set to ignored
    if (opts.native === true) {
      core.info(
        ` -- Ignore implicit node-gyp bindings of package ${name}@${version} in ${node.location}: ${finding.cmd}`
      )
      return true
    }
  } else if (finding.type === "SCRIPT") {
    // ignore if found script is specfied to be ignored
    if (opts.scripts?.includes(finding.name)) {
      core.info(
        ` -- Ignore script ${finding.name} of package ${name}@${version} in ${node.location}: ${finding.cmd}`
      )
      return true
    }
  }

  return false
}
