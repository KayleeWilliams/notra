# Dark launch

A launch-week blog and changelog for a fictional startup, Nova, that ships dark by default with a launch banner on every page.

- **Live:** https://nova-launch.notra.site
- **Setup:** the site's `notra.site` address, no DNS needed
- **Shows:** dark mode as default (readers can still switch), gradient background, Geist headings, magenta brand color with a lighter dark-mode shade, a banner that can't be closed, magazine blog index with a pinned launch post and card images, a `slots/blog-hero.mdx` hero with the three launch days, cover images that share one layout, dark share images, `Steps`, `Tabs`, `CardGroup`, code blocks and callouts in posts
- **Docs:** [Design and CSS](https://usenotra.com/docs/sites/customize/design), [Logo, navigation and banner](https://usenotra.com/docs/sites/customize/navigation), [Layouts](https://usenotra.com/docs/sites/customize/layouts), [Share images](https://usenotra.com/docs/sites/customize/seo#share-images)

## Use it

1. Copy this folder into your repository.
2. In Notra, open **Sites → New site**, pick the repository and, if the folder isn't at the root, turn on **Site is in a subdirectory** and enter its path.
3. Change `banner.content`, `blog.featured` and the days in `slots/blog-hero.mdx` to point at your own launch posts. Remove `banner` when launch week is over.

## Files

```text
blog.json          settings: dark appearance, colors, fonts, banner, magazine layout, authors
style.css          styles for the launch-week hero
slots/             blog-hero.mdx, the launch-week hero with links to each day
blog/              a teaser plus one .mdx file per launch day
changelog/         one .mdx file per release
public/images/     logo, favicon and cover images
```
