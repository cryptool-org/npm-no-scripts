import { defaultGypInstallScript, isNodeGypPackage } from "@npmcli/node-gyp"
import PackageJson from "@npmcli/package-json"

async function loadPackageJson(path) {
  try {
    const { content: pkg } = await PackageJson.normalize(path)
    return pkg
  } catch (error) {
    if (error.code === "ENOENT") return null
    throw error
  }
}

function analyzeScripts(packageJson, isGyp, isLink) {
  const { gypfile, scripts = {} } = packageJson

  const findings = []

  // See: https://github.com/npm/cli/blob/63b9a7c1a65361eb2e082d5f4aff267df52ba817/workspaces/arborist/lib/arborist/rebuild.js#L261-L264
  const hasBindings =
    isGyp && gypfile !== false && !scripts.install && !scripts.preinstall
  if (hasBindings) {
    findings.push({ type: "NATIVE_BINDINGS", cmd: defaultGypInstallScript })
  }

  // skip further checks if no scripts are defined
  if (Object.keys(scripts).length === 0)
    return findings.length > 0 ? findings : null

  // Check for existence of lifecycle scripts that will be run when installing the dependency

  // See: https://github.com/npm/cli/blob/63b9a7c1a65361eb2e082d5f4aff267df52ba817/workspaces/arborist/lib/arborist/rebuild.js#L141-L166
  const installScripts = ["preinstall", "install", "postinstall"]
  for (const scriptName of Object.keys(scripts)) {
    if (installScripts.includes(scriptName)) {
      findings.push({
        type: "SCRIPT",
        name: scriptName,
        cmd: scripts[scriptName],
      })
    }

    // See: https://github.com/npm/cli/blob/63b9a7c1a65361eb2e082d5f4aff267df52ba817/workspaces/arborist/lib/arborist/rebuild.js#L150-L155
    else if (isLink && scriptName === "prepare") {
      findings.push({
        type: "SCRIPT",
        name: scriptName,
        cmd: scripts[scriptName],
      })
    }
  }

  return findings.length > 0 ? findings : null
}

async function analyzePackage(node) {
  const path = node.target.location
  const [packageJson, isGyp] = await Promise.all([
    loadPackageJson(path),
    isNodeGypPackage(path),
  ])

  // skip when no package.json is found
  if (packageJson == null) return

  // check for lifecycle scripts
  const findings = analyzeScripts(packageJson, isGyp, node.isLink)

  return findings
}

export async function analyze(nodes) {
  const results = new Map()

  await Promise.allSettled(
    nodes.map(async (node) => {
      const findings = await analyzePackage(node)
      if (findings == null) return
      results.set(node.name, { node, findings })
    })
  )

  return results
}
