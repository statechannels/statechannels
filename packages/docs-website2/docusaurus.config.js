module.exports={
  "title": "statechannels docs",
  "tagline": "A tech stack for state channel applications and networks",
  "url": "https://protocol.statechannels.org",
  "baseUrl": "/",
  "organizationName": "statechannels",
  "projectName": "docs-website",
  "scripts": [
    "https://buttons.github.io/buttons.js",
    "https://unpkg.com/mermaid@8.6.2/dist/mermaid.min.js"
  ],
  "stylesheets": [
    "https://fonts.googleapis.com/css?family=Chivo&display=swap",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css"
  ],
  "favicon": "img/favicon.ico",
  "customFields": {
    "users": [
      {
        "caption": "User1",
        "image": "/img/undraw_open_source.svg",
        "infoLink": "https://www.facebook.com",
        "pinned": true
      }
    ],
    "markdownPlugins": [
      null
    ],
    "fonts": {
      "myFont": [
        "Chivo",
        "sans-serif"
      ]
    },
    "repoUrl": "https://github.com/statechannels/statechannels",
    "packageUrl": "https://www.npmjs.com/package/@statechannels/nitro-protocol"
  },
  "onBrokenLinks": "log",
  "presets": [
    [
      "@docusaurus/preset-classic",
      {
        "docs": {
          "homePageId": "overview",
          "showLastUpdateAuthor": true,
          "showLastUpdateTime": true,
          "path": "../docs-website/docs",
          "sidebarPath": "/Users/georgeknee/statechannels/statechannels/packages/docs-website2/sidebars.json"
        },
        "blog": {
          "path": "blog"
        },
        "theme": {
          "customCss": "/Users/georgeknee/statechannels/statechannels/packages/docs-website2/src/css/customTheme.css"
        }
      }
    ]
  ],
  "plugins": [],
  "themeConfig": {
    "navbar": {
      "title": "statechannels docs",
      "logo": {
        "src": "img/logo.svg"
      },
      "items": [
        {
          "to": "docs/",
          "label": "Docs",
          "position": "left"
        },
        {
          "to": "docs/typescript-api/index",
          "label": "Typescript API",
          "position": "left"
        },
        {
          "to": "docs/contract-api/contract-inheritance",
          "label": "Contract API",
          "position": "left"
        },
        {
          "label": "Version",
          "to": "docs",
          "position": "right",
          "items": [
            {
              "label": "0.3.1",
              "to": "docs/",
              "activeBaseRegex": "docs/(?!0.1.1|0.2.0|0.3.0|0.3.1|next)"
            },
            {
              "label": "0.3.0",
              "to": "docs/0.3.0/"
            },
            {
              "label": "0.2.0",
              "to": "docs/0.2.0/"
            },
            {
              "label": "0.1.1",
              "to": "docs/0.1.1/"
            },
            {
              "label": "Master/Unreleased",
              "to": "docs/next/",
              "activeBaseRegex": "docs/next/(?!support|team|resources)"
            }
          ]
        }
      ]
    },
    "image": "img/undraw_online.svg",
    "footer": {
      "links": [],
      "copyright": "Copyright © 2020",
      "logo": {
        "src": "img/logo.svg"
      }
    },
    "algolia": {
      "indexName": "statechannels"
    }
  }
}