# nginx

A blog and changelog for a fictional backup company, Stonebridge, served under `/blog` and `/changelog` on its own website through nginx.

- **Live:** https://stonebridge-nginx.notra.site
- **Setup:** nginx in front of the brand's website, forwarding `/blog` and `/changelog` to the site's `notra.site` address. The nginx side is in [`examples/hosts/nginx`](../../hosts/nginx)
- **Shows:** IBM Plex Serif headings with IBM Plex Sans body text from Google Fonts, slate and indigo colors with a dark-mode CSS override, 64rem layout width, magazine blog index with a plain hero and cover images, narrow posts without a table of contents, timeline changelog with versions and images, a logo that links back to the website's `/`, Steps, Tabs, Note and Warning
- **Docs:** [Serve your site under a path](https://usenotra.com/docs/sites/domains/subpath), [nginx and Caddy](https://usenotra.com/docs/sites/domains/nginx), [Design and CSS](https://usenotra.com/docs/sites/customize/design), [Layouts](https://usenotra.com/docs/sites/customize/layouts), [Slots](https://usenotra.com/docs/sites/match-your-website#slots)

## Use it

1. Copy this folder into your repository.
2. In Notra, open **Sites → New site**, pick the repository and, if the folder isn't at the root, turn on **Site is in a subdirectory** and enter its path.
3. Under **Settings → Content → Sections**, set the paths to `/blog` and `/changelog`.
4. Add the nginx config from [`examples/hosts/nginx`](../../hosts/nginx) to your server, with `NOTRA_SITE_ORIGIN` set to your site's Notra address.
5. Open **Domains → Add domain**, enter `www.yourdomain.com/blog`, and click **Check** once nginx is live.

## Files

```text
blog.json          settings: name, logo, colors, fonts, width, navigation, layouts, authors
style.css          slate cards and borders in dark mode
blog/              one .mdx file per post
changelog/         one .mdx file per release
public/images/     logo, favicon and cover images
```
