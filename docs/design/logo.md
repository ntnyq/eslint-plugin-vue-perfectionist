# Logo

The original [Perfectionist](https://perfectionist.dev/) hexagon and sorting bars
form the main mark. A small [Vue](https://github.com/vuejs/art) logo sits inside
the hexagon, in the empty space below and to the right of the sorting bars. The
Vue mark is 160 units wide within the 1024-unit viewport, with its bottom aligned
to the bottom of the shortest sorting bar and its right edge aligned to the
right edge of the longest bar. Vue is drawn last so it appears above overlapping
sorting bars. Both symbols retain
their original path geometry, and the inner hexagon stays transparent.

## Files

All three assets have a transparent background, `width="1024"`, `height="1024"`,
and `viewBox="0 0 1024 1024"`. They contain editable vector geometry with no
embedded bitmap, external asset, or font dependency.

| Asset                                        | Use                                                            |
| -------------------------------------------- | -------------------------------------------------------------- |
| [`logo.svg`](../public/logo.svg)             | Automatic light/dark adaptation through `prefers-color-scheme` |
| [`logo-light.svg`](../public/logo-light.svg) | Fixed colors for light backgrounds                             |
| [`logo-dark.svg`](../public/logo-dark.svg)   | Fixed colors for dark backgrounds                              |

The automatic version defaults to light colors. For an application with its own
theme toggle, select the fixed variant using the application's theme state.
Changing only an ancestor's `.dark` class does not switch an SVG loaded through
an `<img>` element. Editors that do not support SVG media queries should use a
fixed variant.

For VitePress, the files in `docs/public/` can be used as follows:

```ts
themeConfig: {
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  },
}
```

For a Markdown document rendered on GitHub:

```html
<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="docs/public/logo-dark.svg"
  />
  <img
    src="docs/public/logo-light.svg"
    width="128"
    height="128"
    alt="Vue Perfectionist"
  />
</picture>
```

## Palette

| Element                  | Light background | Dark background |
| ------------------------ | ---------------- | --------------- |
| Hexagon and sorting bars | `#4B32C3`        | `#A99AFF`       |
| Outer V                  | `#42B883`        | `#42D392`       |
| Inner V                  | `#35495E`        | `#B8CDD9`       |

The fixed variants share identical geometry, so switching themes does not change
the position or size of the mark. Use at least 32 CSS pixels when the three
sorting bars need to remain distinct.
