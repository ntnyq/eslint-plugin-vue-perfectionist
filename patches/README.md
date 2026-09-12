# Documentation dependency compatibility

## `@shikijs/magic-move@4.4.3`

The complete groups demo exposed a synchronous animation setup cost of about
2.5 seconds per sorting change. The renderer interleaved geometry reads with
style writes for each token, then called `getAnimations()` separately for every
token. Browser profiling showed hundreds of layouts and most CPU samples inside
`getAnimations()`.

The patch reads all destination rectangles before applying transforms and collects
animations once for the container subtree. It groups those animations by target so
each token still waits for its own animations and retains interruption cleanup.
Keep this patch until an upstream renderer batches both operations.

Verify in a real browser with the **All default groups** example: switch sorting
modes repeatedly, reset during an animation, switch examples, and check that code
and diagnostics match the selected mode. Compare main-thread task time and layout
counts around a click with Chrome DevTools Performance metrics. Node-only tests
cannot reproduce the browser's style and animation flush costs.

## FloatingVue override

`@shikijs/vitepress-twoslash@4.4.3` patches
`VMenu.components.Popper.extends.methods`. FloatingVue 5.4.0 changed that internal
component structure, causing `Failed to patch FloatingVue` on page initialization.
The scoped pnpm override keeps Twoslash on FloatingVue 5.2.2, which matches the
structure its client expects. Remove the override when Twoslash supports the new
structure. Verify both a clean console and working hover tooltips when upgrading.
