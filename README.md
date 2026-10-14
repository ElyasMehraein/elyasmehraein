# elyasmehraein.ir

My personal website — a static, single-page site served by GitHub Pages.
No build step, no JavaScript, no dependencies: plain HTML + CSS.

🔗 **https://elyasmehraein.ir**

## Structure

```
index.html                  the whole page
css/style.css               all styles (including responsive rules)
img/elyas.jpg | .webp       portrait photo
img/bg.jpg                  grunge background artwork
img/og.jpg                  1200×630 social preview image
img/favicon-32.png          32×32 favicon
img/apple-touch-icon.png    180×180 iOS home-screen icon
img/elyFaveicon.png         original icon source (kept for re-generation)
CNAME                       custom domain for GitHub Pages
.nojekyll                   tells GitHub Pages to serve files as-is (no Jekyll)
```

## Editing content

Everything lives in `index.html`:

- name, tagline and skills → `<section class="hero">`
- GitHub → `<nav class="contact">`
- page title, description and social preview → `<head>`

Colours and spacing are CSS variables at the top of `css/style.css`
(`--accent` is the blue from the original design).

## Preview locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

GitHub Pages is set to **Deploy from a branch → `main` / root**, so anything
pushed to `main` goes live within a minute — there is nothing to build.

## Notes

- The page is fully static and works with JavaScript disabled.
- Skills icons are loaded from [skillicons.dev](https://skillicons.dev); if that
  service is unreachable the alt text is shown instead.
- The portrait and background images were optimised (the original 310 KB PNG
  portrait and 509 KB background became ~18 KB / ~227 KB). Re-generate them with
  ImageMagick if you replace the source files.
- An earlier version of this site was built with Next.js (commit `8cb1df1`).
  GitHub Pages cannot run a Node server, so it is kept only in the git history.
