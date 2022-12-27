# docu-notion

docu-notion lets you use Notion as your editor for [Docusaurus](https://docusaurus.io/). Using Notion instead of raw markdown files means that you don't have to teach non-developers how to make git commits and pull requests. It also allows you to leverage Notion's database tools to control workflow, Notion's commenting feature to discuss changes, etc.

Example Site: https://sillsdev.github.io/docu-notion-sample-site/

# Instructions

## 1. Set up your documentation site.

First, prepare your markdown-based static file system like [Docusaurus](https://docusaurus.io/). For a shortcut with github actions, search, and deployment to github pages, you can just copy [this template](https://github.com/sillsdev/docu-notion-sample-site).

## 2. In Notion, duplicate the docu-notion template

Go to [this template page](https://hattonjohn.notion.site/Documentation-Template-Docusaurus-0e998b32da3c47edad0f62a25b49818c). Duplicate it into your own workspace.
You can name it anything you like, e.g. "Documentation Root".

## 3. Create a Notion Integration

In order for docu-notion to read your site via Notion's API, you need to create what Notion calls an "integration". Follow [these instructions](https://developers.notion.com/docs/getting-started) to make an integration and get your token. Limit your integration to "READ" access.

## 4. "Invite" your Notion Integration to read you page

In Notion, click "Share" on the root of your documentation and "invite" your integration to it.

![image](https://user-images.githubusercontent.com/8448/168930238-1dcf46df-a690-4839-bf4c-c63157f104d8.png)

## 5. Add your pages under your Outline page.

Currently, docu-notion expects that each page has only one of the following: sub-pages, links to other pages, or normal content. Do not mix them. You can add content pages directly here, but then you won't be able to make use of the workflow features. If those matter to you, instead make new pages under the "Database" and then link to them in your outline pages.

## 6. Pull your pages

First, determine the id of your root page by clicking "Share" and looking at the the url it gives you. E.g.
https://www.notion.so/hattonjohn/My-Docs-0456aa5842946bdbea3a4f37c97a0e5
means that the id is "0456aa5842946PRETEND4f37c97a0e5".

Determine where you want the markdown files and images to land. The following works well for Docusaurus instances:

```
npx docu-notion -n secret_PRETEND123456789PRETEND123456789PRETEND6789 -r 0456aa5842946PRETEND4f37c97a0e5"
```

Likely, you will want to store these codes in your environment variables and then use them like this:

```
(windows)
npx docu-notion -n %MY_NOTION_TOKEN% -r %MY_NOTION_DOCS_ROOT_PAGE_ID%
```

```
(linux / mac)
npx docu-notion -n $MY_NOTION_TOKEN -r $MY_NOTION_DOCS_ROOT_PAGE_ID
```

NOTE: In the above, we are using `npx` to use the latest `docu-notion`. A more conservative approach would be to `npm i cross-var docu-notion` and then create a script in your package.json like this:

```
 "scripts": {
     "pull": "cross-var docu-notion -n %DOCU_NOTION_INTEGRATION_TOKEN% -r %DOCU_NOTION_ROOT_PAGE%"
  }
```

and then run that with `npm run pull`.

## 7. Commit

Most projects should probably commit the current markdown and image files each time you run docu-notion.

Note that if you choose not to commit, the workflow feature (see below) won't work for you. Imagine the case where a document that previously had a `Status` property of `Publish` now has a different status. You probably want to keep publishing the old version until the new one is ready. But if you don't commit files, your CI system (e.g. Github Actions) won't have the old version around, so it will disappear from your site.

# Using a Notion database for workflow

One of the big attractions of Notion for large documentation projects is that you can treat your pages as database items. The advantage of this is that they can then have metadata properties that fit your workflow. For example, we use a simple kanban board view to see where each page is in our workflow:

![image](https://user-images.githubusercontent.com/8448/168929745-e6529375-bb1e-47e9-b8a6-7a1467c8900f.png)

`docu-notion` supports this by letting you link to database pages from your outline.

![image](https://user-images.githubusercontent.com/8448/168929668-f83d7c86-75d2-48e9-940c-84c5268a2854.png)

# Page properties

![image](https://user-images.githubusercontent.com/8448/197016100-ab016111-2fa1-420a-a884-05318783096e.png)

> **Note**
> For some reason Notion only allows properties on pages that are part of a database. So if you create pages directly in the Outline, you won't be able to fill in any of these properties, other than the page title.

## Slugs

By default, pages will be given a slug based on the Notion id. For a human-readable URL, add a notion property named `Slug` to your database pages and enter a value in there that will work well in a URL. That is, no spaces, ?, #, /, etc.

## Known Limitations

docu-notion is not doing anything smart with regards to previously Published but now not Published documents. All it does is ignore every Notion document that doesn't have `status == Publish`. So if the old version of the document is still in your file tree when your static site generator (e.g. Docusaurus) runs, then it will appear on your website. If it isn't there, it won't. If you rename directories or move the document, docu-notion will not realize this and will delete the previously published markdown file.

# Text Localization

Localize your files in Crowdin (or whatever) based on the markdown files, not in Notion. For how to do this with Docusaurus, see [Docusaurus i18n](https://docusaurus.io/docs/i18n/crowdin).

# Screenshot Localization

The only way we know of to provide localization of image in the current Docusaurus (2.0) is to place the images in the same directory as the markdown, and use relative paths for images. Most projects probably won't localize _every_ image, so we also need a way to "fall back" to the original screenshot when the localized one is missing. `docu-notion` facilitates this. If no localized version of an image is available, `docu-notion` places a copy of the original image into the correct location.

So how do you provide these localized screenshot files? Crowdin can handle localizing assets, and in the future we may support that. For now, we currently support a different approach. If you place for example `fr https:\\imgur.com\1234.png` in the caption of a screenshot in Notion, `docu-notion` will fetch that image and save it in the right place to be found when in French mode. Getting URLs to screenshots is easy with screenshot utilities such as [Greenshot](https://getgreenshot.org/) that support uploading to imgur. Note that `docu-notion` stores a copy of all images in your source tree, so you wouldn't lose the images if imgur were to go away.

NOTE: that as far as I can tell, when you run `docusaurus start` docusaurus 2.0 offers the language picker but it doesn't actually work. So to test out the localized version, do `docusaurus build` followed by `docusaurus serve`.

NOTE: if you just localize an image, it will not get picked up. You also must localize the page that uses the image. Otherwise, Docusaurus will use the English document and when that asks for `./the-image-path`, it will find the image there in the English section, not your other language section.

# Automated builds with Github Actions

Here is a working Github Action script to copy and customize: https://github.com/BloomBooks/bloom-docs/blob/master/.github/workflows/release.yml

# Links within mermaid code blocks

Mermaid code blocks can contain clickable links to other notion documents. This works great in notion, but to convert you might need to add the flag:

```
  --slug-prefix <path>
```

where `<path>` might be e.g. `blog` if the root of the converted documents is are your blogs and they live in the directory "./blog".

This converts the `An internal page` node below into a clickable link in your published site:

```mermaid
graph LR
  A[An internal page] --> B(Somewhere else)
  click A "https://www.notion.so/Introduction-to-docu-notion-779f83504bd94642a9b87b2afc810aaa"
```

```
graph LR
  A[An internal page] --> B(Somewhere else)
  click A "https://www.notion.so/Introduction-to-docu-notion-779f83504bd94642a9b87b2afc810aaa"
```



# Command line

Usage: docu-notion -n <token> -r <root> [options]

Options:

| flag                         | required? | description                                                                                                                                                                                                        |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| -n, --notion-token           | required  | notion api token, which looks like `secret_3bc1b50XFYb15123RHF243x43450XFY33250XFYa343`                                                                                                                            |
| -r, --root-page              | required  | The 31 character ID of the page which is the root of your docs page in notion. The code will look like `9120ec9960244ead80fa2ef4bc1bba25`. This page must have a child page named 'Outline'                        |
| -m, --markdown-output-path   |           | Root of the hierarchy for md files. WARNING: node-pull-mdx will delete files from this directory. Note also that if it finds localized images, it will create an i18n/ directory as a sibling. (default: "./docs") |
| -t, --status-tag             |           | Database pages without a Notion page property 'status' matching this will be ignored. Use '\*' to ignore status altogether. (default: `Publish`)                                                                   |
| --locales                    |           | Comma-separated list of iso 639-2 codes, the same list as in docusaurus.config.js, minus the primary (i.e. 'en'). This is needed for image localization. (default: [])                                             |
| -l, --log-level              |           | Log level (choices: `info`, `verbose`, `debug`)                                                                                                                                                                    |
| -i, --img-output-path        |           | Path to directory where images will be stored. If this is not included, images will be placed in the same directory as the document that uses them, which then allows for localization of screenshots.             |
| -p, --img-prefix-in-markdown |           | When referencing an image from markdown, prefix with this path instead of the full img-output-path. Should be used only in conjunction with --img-output-path.                                                     |
| -s, --mermaid-slug-prefix    |           | Code block mermaid diagrams can contain document links that are not processed by docusaurus. docu-notion prefixes the document slug with this value to correct this (default "").                                  |
| -h, --help                   |           | display help for command                                                                                                                                                                                           |
