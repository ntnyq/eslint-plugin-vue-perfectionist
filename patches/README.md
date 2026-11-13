# Dependency compatibility and security

## Legacy Vue SSR attribute validation

The private `vue-runtime-legacy` fixture deliberately retains Vue 3.4.38 to test
older model behavior. Its `@vue/shared@3.4.38` patch backports the missing
carriage-return check in SSR attribute names from
[GHSA-g2v6-rqmx-r4w6](https://github.com/advisories/GHSA-g2v6-rqmx-r4w6).
The three distributed JavaScript builds receive the same one-character fix;
the model compiler and runtime behavior remain on the legacy version.

`tests/integration/legacy-runtime-security.test.ts` verifies that an attribute
name containing a carriage return is rejected while ordinary attributes still
render. Keep the patch while this fixture is pinned. Package-version audits
still report the old server-renderer version because they do not inspect this
backport. Do not suppress the advisory globally.

## minimatch preprocessing

The workspace override moves affected minimatch versions to 11.0.7 for
[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
Current ESLint and typescript-eslint releases still request vulnerable 10.x
versions. Remove the override once those consumers require patched releases.
Workspace overrides protect this repository's installed tooling; they do not
propagate to consumers of the published plugin. Consumers should audit their
own ESLint dependency graph and apply a patched resolution as needed.

## KaTeX renderer options

The Markdown linting toolchain reaches KaTeX through `micromark-extension-math`.
The workspace override uses 0.18.2 or newer for
[GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7),
which rejects inherited renderer settings that could otherwise bypass trust
restrictions after prototype pollution elsewhere. Remove this override once
the upstream toolchain requires a patched version.

## `@shikijs/magic-move@4.6.0`

The complete groups demo exposed a synchronous animation setup cost of about
2.5 seconds per sorting change. The renderer interleaved geometry reads with
style writes for each token, then called `getAnimations()` separately for every
token. Browser profiling showed hundreds of layouts and most CPU samples inside
`getAnimations()`.

The patch reads all destination rectangles before applying transforms and collects
animations once for the container subtree. It groups those animations by target so
each token still waits for its own animations and retains interruption cleanup.
Keep this patch until an upstream renderer batches both operations.

The 4.6.0 renderer is unchanged from 4.5.0, so the patch applies unchanged.
The docs dependency is pinned to the patched version and excluded from Taze
updates. When upgrading it manually, inspect the upstream renderer, migrate or
remove the patch, update `patchedDependencies`, and run `pnpm install` together.

Verify in a real browser with the **All default groups** example: switch sorting
modes repeatedly, reset during an animation, switch examples, and check that code
and diagnostics match the selected mode. Compare main-thread task time and layout
counts around a click with Chrome DevTools Performance metrics. Node-only tests
cannot reproduce the browser's style and animation flush costs.

## FloatingVue compatibility

`@shikijs/vitepress-twoslash@4.6.0` patches the mounted `VMenu` instance through
its `popper` ref instead of accessing `VMenu.components.Popper.extends.methods`.
This supports FloatingVue 5.4, so the previous 5.2.2 override is no longer needed.
Verify both a clean console and working hover tooltips when upgrading.
