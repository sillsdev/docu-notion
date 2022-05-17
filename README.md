
-- THIS PROJECT HAS NOT ACTUALLY LAUNCHED YET --

# notion-pull

notion-pull lets you use Notion as your front end for large documentation projects based on projects like [Docusaurus](https://docusaurus.io/). Using Notion instead of raw markdown files means that you don't have to teach non-developers how to make git commits and PRs. It also allows you to leverage Notion's database tools to control workflow, commenting feature to discuss changes, etc.

## 1. Set up your documentation site.

notion-pull is not the actual website. You'll need to set up a markdown-based static file system like [Docusaurus](https://docusaurus.io/). You can then use notion-pull to populate your repository with markdown files and images.

## 2. Create page in Notion to serve as the root of your documentation

You can name it anything you like, e.g. "Documentation Root".

## 3. Set up Notion Integration

Follow [these instructions](https://developers.notion.com/docs/getting-started) to make an "integration" and get your token. Limit your integration to "READ" access.

## 4. "Invite" your api integration

In Notion, click "Share" on the root of your documentation and "invite" your integration to it.

![image](https://user-images.githubusercontent.com/8448/168930238-1dcf46df-a690-4839-bf4c-c63157f104d8.png)

## 5. Under your documentation root, add a page named "Outline"

## 6. Add your pages under your Outline page.

Currently, notion-pull expects that each page has only one of the following: subpages, links to other pages, or normal content. Do not mix them.

## 7. Pull your pages

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

## 8. Commit (or not)

It's up to you whether you want to keep these files in the git history of your site. If you don't, `.gitignore` these locations.

# Advanced: using a Notion database

One of the big attractions of Notion for large documentation projects is that you can treat your pages as database items. The advantage of this is that they can then have metadata properties that fit your workflow. For example, we use a simple kanban board view to see where each page is in our workflow:


![image](https://user-images.githubusercontent.com/8448/168929745-e6529375-bb1e-47e9-b8a6-7a1467c8900f.png)

`notion-pull` supports this by letting you link to database pages from your outline.

![image](https://user-images.githubusercontent.com/8448/168929668-f83d7c86-75d2-48e9-940c-84c5268a2854.png)
