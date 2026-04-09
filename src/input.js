import * as core from "@actions/core"
import semverValidRange from "semver/ranges/valid"

function parseStringOrArray(data) {
  if (typeof data === "string") {
    return data
  }

  if (data instanceof Array) {
    for (const i of data) {
      if (typeof i !== "string") throw new Error()
    }
    return data
  }

  throw new Error()
}

function validateIgnoreOptions(item, opts) {
  if (typeof opts !== "object" || opts === null)
    return opts === true || opts === 1 || opts === "true"

  const { version, script, native, ...other } = opts
  if (Object.keys(other).length > 0) {
    core.warning(
      `Ignore unknown option(s) for '${item}': ${Object.keys(other)}`
    )
  }

  const options = {}

  try {
    if (version != null) {
      options.version = parseStringOrArray(version)
      if (options.version instanceof Array) {
        options.version = semverValidRange(options.version.join(" || "))
      } else {
        options.version = semverValidRange(options.version)
      }

      if (options.version == null) delete options.version
    }
  } catch {
    core.warning(
      `Invalid format for '${item}.version': Must be either 'string' or '[string]'`
    )
  }

  try {
    if (script != null) {
      options.scripts = parseStringOrArray(script)
      if (typeof options.scripts === "string")
        options.scripts = [options.scripts]
    }
  } catch {
    core.warning(
      `Invalid format for '${item}.script': Must be either 'string' or '[string]'`
    )
  }

  if (native === true || native === "true" || native === 1) {
    options.native = true
  } else if (native === false || native === "false" || native === 0) {
    // these will also be false, as is the default
  } else if (typeof native !== "boolean") {
    core.warning(`Invalid format for '${item}.native': Must be 'boolean'`)
  }

  return Object.keys(options).length > 0 ? options : false
}

export function getIgnoreList() {
  const ignoreInput = core.getInput("ignore", { required: false })
  if (ignoreInput === "") return new Map()

  const ignores = new Map()
  try {
    const data = JSON.parse(ignoreInput)
    if (data instanceof Array) {
      for (const item of data) {
        const existing = ignores.get(data)
        if (existing !== undefined) {
          core.warning(`Duplicate entry '${item}' in ignore list`)
        }
        ignores.set(item, true)
      }
    } else if (data instanceof Object) {
      for (const [item, opts] of Object.entries(data)) {
        const existing = ignores.get(data)
        if (existing !== undefined) {
          core.warning(
            `Duplicate entry '${item}' in ignore map, only the last is taken into account`
          )
        }
        const options = validateIgnoreOptions(item, opts)
        ignores.set(item, options)
      }
    }
  } catch (err) {
    core.warning(`Invalid 'ignore' configuration: ${err.message}`)
  }

  return ignores
}
