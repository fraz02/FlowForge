Vercel deployment

- This is a static SPA. `index.html` lives at the project root.
- Vercel will serve the site as-is; the catch-all rewrite is in `vercel.json`.
- If you add a build step, update `package.json` `build` script to output files into the project root or set `outputDirectory` in `vercel.json`.

Quick deploy steps:

1. Push repository to GitHub/GitLab/Bitbucket.
2. In Vercel dashboard, import the repo and deploy. No build step is required for the current setup.

Optional: To enable a build step, add your bundler and set `scripts.build` accordingly, e.g. `webpack --config webpack.config.js`.
