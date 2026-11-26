# Deploying to cPanel from GitHub

Flow: you push to GitHub, cPanel pulls the repo, and one click (or a webhook) rebuilds the app.

## How it works

Shared cPanel plans cap an account at about 1 GB of memory, and both `pnpm install` and `next build` go over it
and get killed. So the server never installs or builds anything:

1. On every push, GitHub Actions (`.github/workflows/ci.yml`) builds the app and packs `deploy.tar.gz`
   (`scripts/pack-deploy.sh`): the Next.js **standalone** server with only the node_modules it needs, the static
   files, the worker and a small migrator bundled into plain JS (`worker.mjs`, `migrate.mjs`), and the migrations.
2. It publishes the file as the GitHub release **`deploy-<branch>`** (for `main`: `deploy-main`).
3. On the server, `scripts/cpanel/deploy.sh` (run by `.cpanel.yml`) downloads that release, runs the migrations,
   swaps the files in `~/tracker` and restarts the app. `.env`, `storage/` and the logs are kept.

The server needs outbound HTTPS to github.com (port 443), which cPanel hosts allow.

## What the host must have

| Need | Why | How to check |
|---|---|---|
| **Node.js 20.12 or newer** (22 recommended) | Next.js 16, `process.loadEnvFile` | cPanel > Setup Node.js App > Node.js version |
| **MySQL 8.0.16+** (or MariaDB 10.4+) | The app uses MySQL | cPanel > Manage My Databases. Older versions refuse the first migration (it uses expression defaults and a CHECK). |
| **About 600 MB of memory** | The web server peaks near 300 MB, a worker run near 250 MB | cPanel > Resource Usage |
| **Cron** | Sends emails, the verify reminder and the Thursday weekly report | cPanel > Cron Jobs |
| **Git Version Control** and **SSH access** | Pulls the repo and runs `.cpanel.yml` | cPanel > Git Version Control, Manage Shell |

`ffmpeg` (voice notes and video playback) is optional. Without it, uploads still work; audio and video just stay in their original format.

## One-time setup

1. **Database.** cPanel > Manage My Databases: create a database and a user, and add the user to the database with
   ALL PRIVILEGES. cPanel puts your account name in front of both (for example `cpuser_tracker`). Or from the
   Terminal, with a generated password that is never shown:

   ```bash
   P=$(openssl rand -hex 24)
   uapi Mysql create_database name=cpuser_tracker
   uapi Mysql create_user name=cpuser_tracker password="$P"
   uapi Mysql set_privileges_on_database user=cpuser_tracker database=cpuser_tracker privileges=ALL
   ```

   Your `DATABASE_URL` looks like `mysql://cpuser_tracker:PASSWORD@localhost:3306/cpuser_tracker`. If the password
   has symbols such as `@`, `#` or `/`, URL-encode them (`@` becomes `%40`).
2. **Clone.** cPanel > Git Version Control > Create: paste the GitHub clone URL. Set the repository path to
   `~/repositories/tracker`.
3. **Node app.** cPanel > Setup Node.js App > Create Application:
   - Node.js version: 22
   - Application mode: Production
   - Application root: `tracker`  (this is `~/tracker`, the folder the deploy script fills)
   - Application URL: your domain or sub-domain
   - Application startup file: **`app.js`**  (it loads `~/tracker/.env`, then starts the standalone server)

   Do not press "Run NPM Install": the bundle already contains its node_modules.
4. **Secrets in `~/tracker/.env`** (not in the Node app screen: the worker cron and the migrator read the same
   file). Make it readable only by you (`chmod 600`). Generate secrets with `openssl rand -base64 32`:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | from step 1 |
   | `APP_URL` and `BETTER_AUTH_URL` | `https://your-domain` |
   | `BETTER_AUTH_SECRET` | random |
   | `CREDENTIALS_KEY` | random, 32 bytes base64. **Never change or lose it**: it decrypts saved account passwords. |
   | `FILE_URL_SECRET` | random |
   | `STORAGE_DRIVER` | `local` (files under `~/tracker/storage`) or `s3` |
   | `EMAIL_DRIVER` | `resend` (or `console` to print emails to `worker.log`) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | from Resend |

5. **First deploy.** Wait until the GitHub Actions run of your branch is green, then Git Version Control > Manage >
   Pull or Deploy > Update from Remote > **Deploy HEAD Commit**. Or in the Terminal:
   `bash ~/repositories/tracker/scripts/cpanel/deploy.sh`.
6. **First data and the first owner.** In the Terminal, inside `~/tracker`:

   ```bash
   cd ~/tracker && export PATH=$HOME/nodevenv/tracker/22/bin:$PATH
   SEED_PASSWORD=$(openssl rand -hex 24) node seed.mjs > /dev/null   # workspace, teams, people, projects, backlog
   node admin.mjs you@example.com --rename-from mosab@vendoor.test    # asks for your password, never shows it
   ```

   The seed gives every seeded person a random password nobody knows; they get in through "Forgot password" once
   their real email is set in Settings > Members. `admin.mjs` makes you the owner (super admin); without
   `--rename-from` it creates a new member instead of taking over a seeded one.
7. **Cron for the worker.** cPanel > Cron Jobs, every minute:

   ```
   * * * * * cd $HOME/tracker && /usr/bin/flock -n /tmp/tracker-worker.lock $HOME/nodevenv/tracker/22/bin/node worker.mjs --once >> $HOME/tracker/worker.log 2>&1
   ```

   `flock -n` skips a run if the previous one is still going. Each run works for about 55 seconds, so emails go out within a minute.

## Every update

1. `git push` to GitHub.
2. Wait for the GitHub Actions run to finish (about 3 minutes). It updates the release `deploy-<branch>`.
3. cPanel > Git Version Control > Manage > Pull or Deploy > **Update from Remote**, then **Deploy HEAD Commit**.

Migrations run automatically. If you deploy before CI has finished, the script says the bundle is older than your
checkout; deploy again when the run is green.

The migrator (`migrate.mjs`) writes Prisma's own `_prisma_migrations` table with the same checksums, so
`prisma migrate status` from your computer still works against the same database.

## Checks after a deploy

- Open the site and sign in.
- `~/tracker/worker.log` shows `[worker] started (one shot)` every minute.
- Settings > Work week shows Saturday to Thursday.
- Reports > Weekly report > Send report > Copy a link: the link should open in a private window.

## Limits to know about

- Passenger may stop an idle app. The first request after a long quiet period is slower.
- Real-time refresh uses polling (`/api/changes`), so it works without WebSockets.
- The app runs one worker at a time (the lock). That is enough for this team size.
