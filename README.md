# notion-pull

notion-pull lets you use Notion as your editor for markdown-based static site generators like [Docusaurus](https://docusaurus.io/). Using Notion instead of raw markdown files means that you don't have to teach non-developers how to make git commits and pull requests. It also allows you to leverage Notion's database tools to control workflow, Notion's commenting feature to discuss changes, etc.

Note that notion-pull is not a service that could be reading your data. `node-pull` is just open-source code that will run on your computer or your continuous integration system.

## 1. Set up your documentation site.

First, prepare your markdown-based static file system like [Docusaurus](https://docusaurus.io/).

## 2. In Notion, duplicate the notion-pull template

Go to [this template page](https://hattonjohn.notion.site/Documentation-Template-Docusaurus-0e998b32da3c47edad0f62a25b49818c). Duplicate it into your own workspace.
You can name it anything you like, e.g. "Documentation Root".

## 3. Create a Notion Integration

In order for notion-pull to read your site via Notion's API, you need to create what Notion calls an "integration". Follow [these instructions](https://developers.notion.com/docs/getting-started) to make an integration and get your token. Limit your integration to "READ" access.

## 4. "Invite" your Notion Integration to read you page

In Notion, click "Share" on the root of your documentation and "invite" your integration to it.

![image](https://user-images.githubusercontent.com/8448/168930238-1dcf46df-a690-4839-bf4c-c63157f104d8.png)

## 5. Add your pages under your Outline page.

Currently, notion-pull expects that each page has only one of the following: subpages, links to other pages, or normal content. Do not mix them. You can add content pages directly here, but then you won't be able to make use of the workflow features. If those matter to you, instead make new pages under the "Database" and then link to them in your outline pages.

## 6. Pull your pages

First, determine the id of your root page by clicking "Share" and looking at the the url it gives you. E.g.
https://www.notion.so/hattonjohn/My-Docs-0456aa5842946bdbea3a4f37c97a0e5
means that the id is "0456aa5842946PRETEND4f37c97a0e5".

Determine where you want the markdown files and images to land. The following works well for Docusaurus instances:

```
npx notion-pull -n secret_PRETEND123456789PRETEND123456789PRETEND6789 -r 0456aa5842946PRETEND4f37c97a0e5 -m "./docs" -i "./images"
```

Likely, you will want to store these codes in your environment variables and then use them like this:

```
(windows)
npx notion-pull -n %MY_NOTION_TOKEN% -r %MY_NOTION_DOCS_ROOT_PAGE_ID% -m "./docs" -i "./static/notion_images" -p "/notion_images/"
```

```
(linux / mac)
npx notion-pull -n $MY_NOTION_TOKEN -r $MY_NOTION_DOCS_ROOT_PAGE_ID -m "./docs" -i "./static/notion_images" -p "/notion_images/"
```

## 7. Commit

Most projects should probably commit the current markdown and image files each time you run notion-pull.

Note that if you choose not to commit, the workflow feature (see below) won't work for you. Imagine the case where a document that previously had a `Status` property of `Publish` now has a different status. You probably want to keep publishing the old version until the new one is ready. But if you don't commit files, your CI system (e.g. Github Actions) won't have the old version around, so it will disappear from your site.

# Advanced: using a Notion database for workflow

One of the big attractions of Notion for large documentation projects is that you can treat your pages as database items. The advantage of this is that they can then have metadata properties that fit your workflow. For example, we use a simple kanban board view to see where each page is in our workflow:

![image](https://user-images.githubusercontent.com/8448/168929745-e6529375-bb1e-47e9-b8a6-7a1467c8900f.png)

`notion-pull` supports this by letting you link to database pages from your outline.

![image](https://user-images.githubusercontent.com/8448/168929668-f83d7c86-75d2-48e9-940c-84c5268a2854.png)

## Known Limitations

notion-pull is not doing anything smart with regards to previously Published but now not Published documents. All it does is ignore every Notion document that doesn't have `status == Publish`. So if the old version of the document is still in your file tree when your static site generator (e.g. Docusaurus) runs, then it will appear on your website. If it isn't there, it won't. If you rename directories or move the document, notion-pull will not realize this and will delete the previously published markdown file.

Links from one document to another in Notion are not yet converted to local links.

Notion-pull makes some attempt to keep the right order of things, but there are definitely cases where it isn't smart enough yet.

# Localization

Localize your files in Crowdin (or whatever) based on the markdown files, not in Notion. For how to do this with Docusaurus, see [Docusaurus i18n](https://docusaurus.io/docs/i18n/crowdin).

# Automated builds with Github Actions

Here is a working Github Action script to copy and customize: https://github.com/BloomBooks/bloom-docs/blob/master/.github/workflows/release.yml
