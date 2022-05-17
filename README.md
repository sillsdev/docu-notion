# notion-pull

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]

## Install

```bash
npm install notion-pull
```

## Usage with defaults that work for Docusaurus

```
npx notion-pull -n %MY_NOTION_TOKEN_ENV_VAR%
```

## Usage with customized output locations

```
npx notion-pull -n %MY_NOTION_TOKEN_ENV_VAR%  --markdown-output-path "./docs" --img-output-path"./static/notion_images"
```
