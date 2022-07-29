# notion-pull-mdx

notion-pull-mdx lets you use Notion as your editor for markdown-based static site generators like [Docusaurus](https://docusaurus.io/). Using Notion instead of raw markdown files means that you don't have to teach non-developers how to make git commits and pull requests. It also allows you to leverage Notion's database tools to control workflow, Notion's commenting feature to discuss changes, etc.

Example Site: https://sillsdev.github.io/notion-pull-mdx-sample-site/

# Instructions

## 1. Set up your documentation site.

First, prepare your markdown-based static file system like [Docusaurus](https://docusaurus.io/). For a shortcut with github actions, search, and deployment to github pages, you can just copy [this template](https://github.com/sillsdev/notion-pull-mdx-sample-site).

## 2. In Notion, duplicate the notion-pull-mdx template

Go to [this template page](https://hattonjohn.notion.site/Documentation-Template-Docusaurus-0e998b32da3c47edad0f62a25b49818c). Duplicate it into your own workspace.
You can name it anything you like, e.g. "Documentation Root".

## 3. Create a Notion Integration

In order for notion-pull-mdx to read your site via Notion's API, you need to create what Notion calls an "integration". Follow [these instructions](https://developers.notion.com/docs/getting-started) to make an integration and get your token. Limit your integration to "READ" access.

## 4. "Invite" your Notion Integration to read you page

In Notion, click "Share" on the root of your documentation and "invite" your integration to it.

![image](https://user-images.githubusercontent.com/8448/168930238-1dcf46df-a690-4839-bf4c-c63157f104d8.png)

## 5. Add your pages under your Outline page.

Currently, notion-pull-mdx expects that each page has only one of the following: subpages, links to other pages, or normal content. Do not mix them. You can add content pages directly here, but then you won't be able to make use of the workflow features. If those matter to you, instead make new pages under the "Database" and then link to them in your outline pages.

## 6. Pull your pages

First, determine the id of your root page by clicking "Share" and looking at the the url it gives you. E.g.
https://www.notion.so/hattonjohn/My-Docs-0456aa5842946bdbea3a4f37c97a0e5
means that the id is "0456aa5842946PRETEND4f37c97a0e5".

Determine where you want the markdown files and images to land. The following works well for Docusaurus instances:

```
npx notion-pull-mdx -n secret_PRETEND123456789PRETEND123456789PRETEND6789 -r 0456aa5842946PRETEND4f37c97a0e5"
```

Likely, you will want to store these codes in your environment variables and then use them like this:

```
(windows)
npx notion-pull-mdx -n %MY_NOTION_TOKEN% -r %MY_NOTION_DOCS_ROOT_PAGE_ID%
```

```
(linux / mac)
npx notion-pull-mdx -n $MY_NOTION_TOKEN -r $MY_NOTION_DOCS_ROOT_PAGE_ID
```

NOTE: In the above, we are using `npx` to use the latest `notion-pull-mdx`. A more conservative approach would be to `npm i cross-var notion-pull-mdx` and then create a script in your package.json like this:

```
 "scripts": {
     "pull": "cross-var notion-pull-mdx -n %NOTION_PULL_INTEGRATION_TOKEN% -r %NOTION_PULL_ROOT_PAGE%"
  }
```

and then run that with `npm run pull`.

## 7. Commit

Most projects should probably commit the current markdown and image files each time you run notion-pull-mdx.

Note that if you choose not to commit, the workflow feature (see below) won't work for you. Imagine the case where a document that previously had a `Status` property of `Publish` now has a different status. You probably want to keep publishing the old version until the new one is ready. But if you don't commit files, your CI system (e.g. Github Actions) won't have the old version around, so it will disappear from your site.

# Advanced: using a Notion database for workflow

One of the big attractions of Notion for large documentation projects is that you can treat your pages as database items. The advantage of this is that they can then have metadata properties that fit your workflow. For example, we use a simple kanban board view to see where each page is in our workflow:

![image](https://user-images.githubusercontent.com/8448/168929745-e6529375-bb1e-47e9-b8a6-7a1467c8900f.png)

`notion-pull-mdx` supports this by letting you link to database pages from your outline.

![image](https://user-images.githubusercontent.com/8448/168929668-f83d7c86-75d2-48e9-940c-84c5268a2854.png)

## Known Limitations

notion-pull-mdx is not doing anything smart with regards to previously Published but now not Published documents. All it does is ignore every Notion document that doesn't have `status == Publish`. So if the old version of the document is still in your file tree when your static site generator (e.g. Docusaurus) runs, then it will appear on your website. If it isn't there, it won't. If you rename directories or move the document, notion-pull-mdx will not realize this and will delete the previously published markdown file.

Links from one document to another in Notion are not yet converted to local links.

notion-pull-mdx makes some attempt to keep the right order of things, but there are definitely cases where it isn't smart enough yet.

# Text Localization

Localize your files in Crowdin (or whatever) based on the markdown files, not in Notion. For how to do this with Docusaurus, see [Docusaurus i18n](https://docusaurus.io/docs/i18n/crowdin).

# Screenshot Localization

The only way we know of to provide localization of image in the current Docusaurus (2.0) is to place the images in the same directory as the markdown, and use relative paths for images. Most projects probably won't localize _every_ image, so we also need a way to "fall back" to the original screenshot when the localized one is missing. `notion-pull-mdx` facilitates this. If no localized version of an image is available, `notion-pull-mdx` places a copy of the original image into the correct location.

So how do you provide these localized screenshot files? Crowdin can handle localizing assets, and in the future we may support that. For now, we currently support a different approach. If you place for example `fr https:\\imgur.com\1234.png` in the caption of a screenshot in Notion, `notion-pull-mdx` will fetch that image and save it in the right place to be found when in French mode. Getting URLs to screenshots is easy with screenshot utilities such as [Greenshot](https://getgreenshot.org/) that support uploading to imgur. Note that `notion-pull-mdx` stores a copy of all images in your source tree, so you wouldn't lose the images if imgur were to go away.

NOTE: that as far as I can tell, when you run `docusaurus start` docusaurus 2.0 offers the language picker but it doesn't actually work. So to test out the localized version, do `docusaurus build` followed by `docusaurus serve`.

NOTE: if you just localize an image, it will not get picked up. You also must localize the page that uses the image. Otherwise, Docusaurus will use the English document and when that asks for `./the-image-path`, it will find the image there in the English section, not your other language section.

# Automated builds with Github Actions

Here is a working Github Action script to copy and customize: https://github.com/BloomBooks/bloom-docs/blob/master/.github/workflows/release.yml
