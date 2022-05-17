# notion-pull

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]

## 1. Create page in Notion to serve as the root of your documentation

You can name it anything you like, e.g. "Documentation Root".

## 2. Setup Notion Integration

Follow [these instructions](https://developers.notion.com/docs/getting-started) to make an "integration" and get your token. Limit your integration to "READ" access.

## 3. "Invite" your api integration

In Notion, click "Share" on the root of your documentation and "invite" your integration to it.

## 4. Under your documentation root, add a page named "Outline"

## 5. Add your pages under your Outline page.

Currently, notion-pull expects that each page has only one of the following: subpages, links to other pages, or normal content. Do not mix them.

## 5. Pull your pages

In the following, you can get the root ID (-r) by copying a link to the root page and finding the ID inside. E.g.
https://www.notion.so/hattonjohn/My-Docs-0456aa5842946bdbea3a4f37c97a0e5
would have a page id of "0456aa5842946bdbea3a4f37c97a0e5".

```
npx notion-pull -n %MY_NOTION_TOKEN_ENV_VAR% -r %MY_NOTION_DOCS_ROOT_PAGE_ID%
```

The defaults work for Docusaurus instances, or you can customize the output locations:

```
--markdown-output-path "./docs" --img-output-path"./static/notion_images"
```

## 6. Commit (or not)

It's up to you whether you want to keep these files in the git history of your site. If you don't, `.gitignore` these locations.

# Advanced: using a Notion database

One of the big attractions of Notion for large documentation projects is that you can create a database in which the records are each one document, and then create a workflow with document status, assignments, etc.

`node-pull` supports this by letting you link to database pages from your outline.
