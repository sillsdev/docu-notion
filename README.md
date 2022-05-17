# notion-pull

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]

## Install

```bash
npm install notion-pull
```

## Usage

```ts
import { notionPull } from 'notion-pull';

notionPull(process.env.MY_NOTION_TOKEN, "./docs","./static/notion_images");

```

## API

### notionPull(token, docs-destination-path, image-destination-path)
