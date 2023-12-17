# Description
KIRA's documentation system integrates with docu-notion-kira, a forked version of [docu-notion](https://github.com/sillsdev/docu-notion) tailored for Kira Network, which allows the use of Notion as the primary editing platform to produce content suitable for static site generators like Docusaurus. This unique combination meets several challenging requirements, such as workflow features, localization support via Crowdin, and capabilities for both online and offline distribution. Future plans include adding versioning capabilities.

# How It Works ?

Docu-notion fetches content from a provided Notion page and produce a structured folder of markdown-base files. The notion page being fetched has two main components:

1. **The Database (Optional)** - This is where the documentation pages are stored. They include content and are equipped with workflow properties to facilitate a Kanban-style management process where pages can have metadata that can be leveraged and are published according to their ‘status’.
2. **The Outline Page (Mandatory)** - This is a central Notion page that organizes content hierarchically. It serves as the foundation of the documentation structure. The arrangement of sub-pages within the Outline is directly reflected in the final documentation site and its sidebar navigation. These sub-pages should link back to the relevant documents housed in the database.

### **Page Structure in the Outline**

Each page listed under the Outline page is expected to be only one of the following type:

- sub-pages (a page containing others pages with content and/or sub-pages)
- symbolic links to other pages of the database (if the database is utilized)
- or standard page with content
    
    The use of the database is optional because pages with content can be directly included in the Outline. However, these pages won't have access to the advanced workflow features provided by the database integration. Sub-pages function as subsections of the documentation. They are transformed into dropdown menus in the sidebar of the documentation site. Due to this structural role, sub-pages cannot hold content themselves (which won’t be displayed), they are only meant to organize the documentation and provide navigation to more detailed content contained in linked or nested pages.

# Setup: Docu-notion-kira + docusaurus

#### Host specs:

Ubuntu 20.04

#### Software specs:

- NodeJS `[v21.4.0]`
- npm `[v10.2.4]`
- yarn `[v1.22.21]`

## NodeJS installation

1. **Create a Temporary Directory:**

  ```bash
  mkdir -p ~/tmp && cd ~/tmp 
  ```

2. **Download NodeJS:** 

  ```bash
  wget https://nodejs.org/dist/v21.4.0/node-v21.4.0-linux-x64.tar.xz
  ```

3. **Unpack NodeJS and Set Environment Variables:**
   * Use one of the following methods:
    * **Method A (Persistent Environment Variables):**
        ```bash
        sudo mkdir -p /usr/local/lib/nodejs
        sudo tar -xJvf node-v21.4.0-linux-x64.tar.xz -C /usr/local/lib/nodejs
        echo 'export NODEJS_HOME=/usr/local/lib/nodejs/node-v21.4.0-linux-x64' | sudo tee -a /etc/profile
        echo 'export PATH=$NODEJS_HOME/bin:$PATH' | sudo tee -a /etc/profile
        source /etc/profile
        ```
    
    * **Method B (Temporary Environment Variables):**
        ```bash
        sudo mkdir -p /usr/local/lib/nodejs
        sudo tar -xJvf node-v21.4.0-linux-x64.tar.xz -C /usr/local/lib/nodejs
        echo 'export NODEJS_HOME=/usr/local/lib/nodejs/node-v21.4.0-linux-x64' | sudo tee -a /etc/profile
        echo 'export PATH=$NODEJS_HOME/bin:$PATH' | sudo tee -a /etc/profile
        source /etc/profile
        ```

4. **Install yarn:**

  ```bash
  npm install --global yarn
  ```

5. **Check Installed Versions:**

  ```bash
  node -v
  npm -v
  yarn -v
  ```

## Clone and Prepare Repository for Docusaurus

1. **Clone the Repository:**

  ```bash
  cd ~/tmp
  git clone https://github.com/kmlbgn/docs.kira.network.git
  ```

2. **Set Notion API Token and Root Page:**
  * Replace *** with your Notion token and root page ID. 
  * Set Environment Variables:
    ```bash
    export DOCU_NOTION_SAMPLE_ROOT_PAGE=[***]
    export DOCU_NOTION_INTEGRATION_TOKEN=[***]
    ```
  * Go to the root page and add docu-notion-kira integration. This page should have, as direct children, "Outline" (required) and "Database" (optional) pages. Follow these instructions. Source: [Notion integration](https://developers.notion.com/docs/create-a-notion-integration#give-your-integration-page-permissions)

3. **Install Dependencies:**
  ```bash
  npm install
  ```

4. **Parse Pages with docu-notion:**

  ```bash
  npx docu-notion -n $DOCU_NOTION_INTEGRATION_TOKEN -r $DOCU_NOTION_SAMPLE_ROOT_PAGE
  ```

## Starting Docusaurus Server

1. **Navigate to the Project Directory:**
2. **Start the Docusaurus Server:**
  ```bash
  yarn start
  ```
  * Source [Docusaurus Intallation Guide](https://docusaurus.io/docs/installation)

# Docu-notion Command line

Usage: docu-notion -n <token> -r <root> [options]

Options:

| flag                                  | required? | description                                                                                                                                                                                                        |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| -n, --notion-token <string>           | required  | notion api token, which looks like `secret_3bc1b50XFYb15123RHF243x43450XFY33250XFYa343`                                                                                                                            |
| -r, --root-page <string>              | required  | The 31 character ID of the page which is the root of your docs page in notion. The code will look like `9120ec9960244ead80fa2ef4bc1bba25`. This page must have a child page named 'Outline'                        |
| -m, --markdown-output-path <string>   |           | Root of the hierarchy for md files. WARNING: node-pull-mdx will delete files from this directory. Note also that if it finds localized images, it will create an i18n/ directory as a sibling. (default: "./docs") |
| -t, --status-tag <string>             |           | Database pages without a Notion page property 'status' matching this will be ignored. Use '\*' to ignore status altogether. (default: `Publish`)                                                                   |
| --locales <codes>                     |           | Comma-separated list of iso 639-2 codes, the same list as in docusaurus.config.js, minus the primary (i.e. 'en'). This is needed for image localization. (default: [])                                             |
| -l, --log-level <level>               |           | Log level (choices: `info`, `verbose`, `debug`)                                                                                                                                                                    |
| -i, --img-output-path <string>        |           | Path to directory where images will be stored. If this is not included, images will be placed in the same directory as the document that uses them, which then allows for localization of screenshots.             |
| -p, --img-prefix-in-markdown <string> |           | When referencing an image from markdown, prefix with this path instead of the full img-output-path. Should be used only in conjunction with --img-output-path.                                                     |
| -h, --help                            |           | display help for command                                                                                                                                                                                           |
# Custom parsing (Plugins)

Custom parsing logic can be created using plugins. See the [plugin readme](src/plugins/README.md).

# Callouts ➜ Admonitions

To map Notion callouts to Docusaurus admonitions, ensure the icon is for the type you want.

- ℹ️ ➜ note
- 📝➜ note
- 💡➜ tip
- ❗➜ info
- ⚠️➜ caution
- 🔥➜ danger

The default admonition type, if no matching icon is found, is "note".