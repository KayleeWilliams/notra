# Cloudflare

An engineering blog and changelog for a fictional company, Relaywave, served under `/blog` and `/changelog` on the brand's own domain through a Cloudflare Worker.

- **Live:** https://relaywave-cloudflare.notra.site
- **Setup:** a Cloudflare Worker on the brand's domain forwards `/blog` and `/changelog` to the Notra address. The Worker lives in [`examples/hosts/cloudflare`](../../hosts/cloudflare)
- **Shows:** dark mode only (no toggle), grid background, dark code blocks, separate heading and body fonts, terminal-style blog and changelog heroes from `slots/`, grid blog index with cover images, cards changelog, logo and navbar links back to the host's `/`, Tabs, Steps, Note and Warning callouts, instructions for AI agents
- **Docs:** [Serve your site under a path with Cloudflare](https://usenotra.com/docs/sites/domains/cloudflare), [Serve your site under a path](https://usenotra.com/docs/sites/domains/subpath), [Code](https://usenotra.com/docs/sites/components/code), [Design and CSS](https://usenotra.com/docs/sites/customize/design), [Slots](https://usenotra.com/docs/sites/match-your-website#slots)

## Use it

1. Copy this folder into your repository.
2. In Notra, open **Sites → New site**, pick the repository and, if the folder isn't at the root, turn on **Site is in a subdirectory** and enter its path.
3. Under **Settings → Content → Sections**, set the paths to `/blog` and `/changelog`.
4. Deploy the Worker from [`examples/hosts/cloudflare`](../../hosts/cloudflare) with `NOTRA_SITE_ORIGIN` set to your Notra address.
5. Open **Domains → Add domain**, enter `www.yourdomain.com/blog` and click **Check**.

The logo and the **Home** links point to `/`, which is the host's landing page. On the bare `notra.site` address they lead to a 404.

## Files

```text
blog.json          settings: name, logo, dark appearance, grid, code theme, navigation, authors
style.css          navbar rule and the hero styles
slots/             blog and changelog heroes
blog/              one .mdx file per post
changelog/         one .mdx file per release
public/images/     logo, favicon and cover images
```
