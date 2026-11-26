# Deploying to cPanel from GitHub

Flow: you push to GitHub, cPanel pulls the repo, and one click (or a webhook) rebuilds the app.

## What the host must have

| Need | Why | How to check |
|---|---|---|
| **Node.js 20.9 or newer** (22 recommended) | Next.js 16 | cPanel > Setup Node.js App > Node.js version |
| **MySQL 8.0.16+** (or MariaDB 10.4+) | The app uses MySQL | cPanel > MySQL Databases. The version is on the cPanel home page (Server Information) or in phpMyAdmin. Older versions refuse the first migration (it uses expression defaults and a CHECK). |
| **Enough memory to build** | `next build` needs about 1 GB | If the build is killed, build on your computer or in GitHub Actions and upload `.next` (see "If the build runs out of memory"). |
| **Cron** | Sends emails, the verify reminder and the Thursday weekly report | cPanel > Cron Jobs |
| **Git Version Control** | Pulls from GitHub | cPanel > Git Version Control |

`ffmpeg` (voice notes and video playback) is optional. Without it, uploads still work; audio and video just stay in their original format.

## One-time setup

1. **Database.** cPanel > MySQL Databases: create a database and a user, and add the user to the database with ALL PRIVILEGES. cPanel puts your account name in front of both (for example `cpuser_tracker`). Your `DATABASE_URL` looks like `mysql://cpuser_USER:PASSWORD@localhost:3306/cpuser_DBNAME`. If the password has symbols such as `@`, `#` or `/`, URL-encode them (`@` becomes `%40`).
2. **Clone.** cPanel > Git Version Control > Create: paste the GitHub clone URL. For a private repo, add the cPanel server's SSH key as a deploy key on GitHub (read-only). Set the repository path to `~/repositories/tracker`.
3. **Node app.** cPanel > Setup Node.js App > Create Application:
   - Node.js version: 22
   - Application mode: Production
   - Application root: `tracker`  (this is `~/tracker`, the folder `.cpanel.yml` deploys into)
   - Application URL: your domain or sub-domain
   - Application startup file: `server.js`
4. **Environment variables.** In the same screen add these (generate secrets with `openssl rand -base64 32`):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | from step 1 |
   | `APP_URL` and `BETTER_AUTH_URL` | `https://your-domain` |
   | `BETTER_AUTH_SECRET` | random |
   | `CREDENTIALS_KEY` | random, 32 bytes base64. **Never change or lose it**: it decrypts saved account passwords. |
   | `FILE_URL_SECRET` | random |
   | `STORAGE_DRIVER` | `local` (files under `~/tracker/storage`) or `s3` |
   | `EMAIL_DRIVER` | `resend` |
   | `RESEND_API_KEY`, `EMAIL_FROM` | from Resend |
   | `NODE_ENV` | `production` |

5. **First deploy.** Git Version Control > Manage > Deploy HEAD Commit. This runs `.cpanel.yml`: copies the code, installs, runs migrations, builds, and restarts the app.
6. **First data.** Do not run the demo seed on production. Create your real members and projects by running, once, in the cPanel Terminal inside `~/tracker`: `npx pnpm@10.28.0 run db:seed` **only** if you want the demo people, otherwise add members from Settings after creating the first admin by hand in the database.
7. **Cron for the worker.** cPanel > Cron Jobs, every minute:

   ```
   * * * * * cd $HOME/tracker && source $HOME/nodevenv/tracker/22/bin/activate && /usr/bin/flock -n /tmp/tracker-worker.lock npx pnpm@10.28.0 run worker:once >> $HOME/tracker/worker.log 2>&1
   ```

   `flock -n` skips a run if the previous one is still going. Each run works for about 55 seconds, so emails go out within a minute.

## Every update

```bash
git push origin main        # on your computer
```

Then in cPanel: Git Version Control > Manage > **Pull or Deploy** > Update from Remote > Deploy HEAD Commit. Migrations run automatically, so new tables and columns arrive with the code.

To skip the click, GitHub can call a deploy script on the server after each push (webhook), but that needs a small endpoint on your host. Ask if you want it.

## If the build runs out of memory

Shared plans often kill `next build`. Build somewhere else and ship the result:

1. On your computer: `pnpm install && pnpm build`.
2. Upload the `.next` folder to `~/tracker/.next` (cPanel File Manager or SFTP).
3. In `.cpanel.yml`, delete the line that runs `run build`.

The GitHub Actions workflow (`.github/workflows/ci.yml`) already does step 1 on every push to `main`: open the run, download the artifact **next-build** (`build.tar.gz`), and extract it into `~/tracker` so `.next` lands next to `server.js`. The build uses the Node 22 and the same lockfile as production.

## Checks after a deploy

- Open the site and sign in.
- `~/tracker/worker.log` shows `[worker] started (one shot)` every minute.
- Settings > Work week shows Saturday to Thursday.
- Reports > Weekly report > Send report > Copy a link: the link should open in a private window.

## Limits to know about

- Passenger may stop an idle app. The first request after a long quiet period is slower.
- Real-time refresh uses polling (`/api/changes`), so it works without WebSockets.
- The app runs one worker at a time (the lock). That is enough for this team size.
