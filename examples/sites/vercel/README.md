# Vercel

A blog and changelog for a fictional headless CMS, Quillstack, served under `/blog` and `/changelog` on a website hosted on Vercel.

- **Live:** https://quillstack-vercel.notra.site
- **Setup:** a path on your own website, forwarded with rewrites in `vercel.json`. The host is in [`../../hosts/vercel`](../../hosts/vercel)
- **Shows:** light mode only (no toggle, on purpose: the brand is black ink on white), a Swiss print look with one red accent, oversized blog and changelog heroes from `slots/`, heavy rules and square corners through `style.css`, separate heading and body fonts, logo that links back to the website's home page, list blog index, narrow posts, compact changelog, `Steps`, `Tabs` and `Warning` components
- **Docs:** [Serve your site under a path](https://usenotra.com/docs/sites/domains/subpath), [Vercel](https://usenotra.com/docs/sites/domains/vercel), [Layouts](https://usenotra.com/docs/sites/customize/layouts), [Slots](https://usenotra.com/docs/sites/match-your-website#slots)

## Use it

1. Copy this folder into your repository.
2. In Notra, open **Sites → New site**, pick the repository and, if the folder isn't at the root, turn on **Site is in a subdirectory** and enter its path.
3. Under **Settings → Content → Sections**, set the paths to `/blog` and `/changelog`.
4. Add the rewrites from [`../../hosts/vercel/vercel.json`](../../hosts/vercel/vercel.json) to your Vercel project, with your own Notra address, and deploy.
5. Open **Domains → Add domain**, enter `www.yourdomain.com/blog` and click **Check**.

The logo and the **Product** link point to `/`, which is your website's home page once the site runs under your domain.

## Files

```text
blog.json          settings: name, logo, colors, fonts, light mode, layouts, authors
style.css          rules, square corners and the hero styles
slots/             blog and changelog heroes
blog/              one .mdx file per post
changelog/         one .mdx file per release
public/images/     logo and favicon
```
