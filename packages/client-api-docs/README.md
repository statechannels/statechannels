# Channel API

[![Netlify Status](https://api.netlify.com/api/v1/badges/b7621005-62f0-4142-9901-f72c6c60b55c/deploy-status)](https://app.netlify.com/sites/client-api-docs/deploys)

### Prerequisites

You're going to need:

 - **Linux or macOS** — Windows may work, but is unsupported.
 - **Ruby, version 2.3.1 or newer**
 - **Bundler** — If Ruby is already installed, but the `bundle` command doesn't work, just run `gem install bundler` in a terminal.

### Getting Set Up

1. Fork this repository on GitHub.
2. Clone *your forked repository* (not our original one) to your hard drive with `git clone https://github.com/YOURUSERNAME/slate.git`
3. `cd slate`
4. Initialize and start Slate. You can either do this locally, or with Vagrant:

```shell
# to run locally
bundle install
bundle exec middleman server

# to build
bundle exec middleman build --clean
```

You can now see the docs at http://localhost:4567. Whoa! That was fast!

Learn more about [editing Slate markdown](https://github.com/slatedocs/slate/wiki/Markdown-Syntax).

<a href="https://github.com/slatedocs/slate">
<p align="center">Created wth Slate<br>
<img src="https://raw.githubusercontent.com/lord/img/master/logo-slate.png" alt="Slate: API Documentation Generator" width="226">
</p>
</a>