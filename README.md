# npm-no-scripts GitHub Action

This action checks all installed NPM dependencies for lifecycle scripts (like
`postinstall`) that would be run on installation. If any such script is found,
the action fails with a list of offenders.

## Inputs

| Input Name     | Description                                         | Required | Default |
| -------------- | --------------------------------------------------- | -------- | ------- |
| `ignore`       | List of packages to ignore (JSON)                   | No       | `""`    |
| `ignoreNative` | Whether to ignore the default node-gyp install step | No       | `false` |

#### `ignore`

You can specify dependencies you would like to ignore when scanning for
lifecycle scripts (ideally because you manually vetted them and consider them to
be secure). This can be helpful if you have dependencies that need a
`postinstall` script to be run.

This parameter expects a JSON array of package names or an object as string.

```json
"PKGNAME": {
    "version": VERSION_LIST,
    "script": SCRIPT_LIST,
    "native": IGNORE_NATIVE,
}
```

- `PKGNAME`: the name of the package to ignore
- `VERSION_LIST`: a version string or array of version strings (combined via
  logical or) in the semver format. Only packages that match this version will
  be ignored. NPM rules apply (e.g. `^1.2.3` also matches `1.2.5` and `1.3.0`
  but not `1.2.2` or `2.0.0`, use `=1.2.3` for fixed versions).
- `SCRIPT_LIST`: a string or array of strings of specific scripts to ignore.
  Possible values are `prepare`, `preinstall`, `install`, and `postinstall`
- `IGNORE_NATIVE`: when `true`, ignore implicit runs of `node-gyp` for packages
  that generate native bindings

If `"script"` is present without `"version"`, the specified script(s) will be
ignored in all versions. If only `"version"` is present, everything will be
ignored for the specified version.

_Example: Ignore `esbuild`_

```yaml
- name: Validate step
  uses: cryptool-org/npm-no-scripts@v1
  with:
    ignore: |
      ["esbuild"]
```

or

```yaml
- name: Validate step
  uses: cryptool-org/npm-no-scripts@v1
  with:
    ignore: |
      {"esbuild": true}
```

_Example: Ignore only `postinstall` script for `esbuild`_

```yaml
- name: Validate step
  uses: cryptool-org/npm-no-scripts@v1
  with:
    ignore: |
      {
        "esbuild": {
          "script": "postinstall"
        }
      }
```

_Example: Ignore all scripts in version '0.22.3' of `esbuild`_

```yaml
- name: Validate step
  uses: cryptool-org/npm-no-scripts@v1
  with:
    ignore: |
      {
        "esbuild": {
          "version": "=0.22.3"
        }
      }
```

_Example: Ignore `preinstall` script in version '0.22.3' and patch releases of
`esbuild`_

```yaml
- name: Validate step
  uses: cryptool-org/npm-no-scripts@v1
  with:
    ignore: |
      {
        "esbuild": {
          "version": "~0.22.3",
          "script": "preinstall"
        }
      }
```

## Outputs

This action does not produce outputs. It will only succeed if no lifecycle
script is found.

## Usage

1. Install your dependencies _without_ running any potential scripts:

```yaml
- name: Install dependencies
  run: npm ci --ignore-scripts
```

2. Run this action to verify no scripts would have been run:

```yaml
- name: Validate step
  uses: cryptool-org/npm-no-scripts@v1
```

3. (optional) Run all scripts (in your package and the ignored ones):

```yaml
- name: Configure dependencies
  run: npm rebuild
```

## Security Notes

To limit trivial supply-chain attacks, _never_ run untrusted scripts. Use
`npm clean-install --ignore-scripts` when installing the dependencies. This will
use the lockfile with pinned versions and not execute any lifecycle scripts.

If any of your dependencies needs such a script (like `postinstall`) to function
properly, you can explicitly run them using `npm rebuild <PACKAGE>`.

Please note that `--ignore-scripts` wont execute any of your own scripts defined
in `package.json` either. You either have to run them manually with
`npm run <SCRIPTNAME>` or -- only if you are certain no malicious scripts exist
in your dependencies -- with `npm rebuild`.

## License

This GitHub Action is available under the [MIT License](LICENSE)
