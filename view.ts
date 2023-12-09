// TODO:
//  - Don't update when the left panel is selected

import {
    FrontMatterCache,
    ItemView,
    MarkdownView,
    TFile,
    WorkspaceLeaf, debounce
} from "obsidian";
import SidebarInfobox from "./main";
import { DEFAULT_SETTINGS } from "./settings";

export const viewType = "SidebarInfoboxView";

export class SidebarInfoboxView extends ItemView {
    activeMarkdownLeaf: MarkdownView;
    plugin: SidebarInfobox;
    observers: MutationObserver[];
    internalViewChange: boolean;

    constructor(leaf: WorkspaceLeaf, plugin: SidebarInfobox) {
        super(leaf);
        this.plugin = plugin;
        this.observers = [];
        this.contentEl.addClass("sidebar-infobox-view");
        this.setNoContentMessage();
    }

    async onOpen() {
        console.log("Sidebar Infobox view opened");
        this.setViewContent();
    }

    setViewContent() {
        this.disconnectObservers();

        let frontmatter: FrontMatterCache | undefined;
        const activeFile = this.tryGetActiveFile();

        if (activeFile) {
            const metadata = this.app.metadataCache.getFileCache(activeFile);

            if (metadata?.frontmatter) {
                frontmatter = metadata.frontmatter;
            }
        }

        if (frontmatter) {
            this.contentEl.empty();
            const root = this.contentEl.createDiv("sidebar-infobox-view");

            const imagePropertyName = this.plugin.settings.imageProperty || DEFAULT_SETTINGS.imageProperty;
            const imagesPropertyName = this.plugin.settings.imagesProperty || DEFAULT_SETTINGS.imagesProperty;
            const excludedProperties = this.plugin.settings.excludeProperties.split(",").map(str => str.trim());

            // Also exclude the image properties, if they're defined.
            if (imagePropertyName) {
                excludedProperties.push(imagePropertyName);
            }

            if (imagesPropertyName) {
                excludedProperties.push(imagesPropertyName);
            }

            let flatYaml = this.flattenObject(frontmatter);
            let properties = [...Object.entries(flatYaml)];

            // Sort the properties if needed, based on the settings.
            if (this.plugin.settings.sortProperties) {
                properties.sort((a, b) => a[0].localeCompare(b[0]));
            }

            // Create the img panel first so that it sits above the properties table.
            const imgPanel = root.createDiv("sidebar-infobox-image-viewer");
            const imageLinks: string[] = [];

            const table = root.createEl("table");
            const head = table.createTHead();
            const row = head.createEl("tr");

            row.createEl("th", { text: "Stat" });
            row.createEl("th", { text: "Value" });

            const body = table.createTBody();

            for (const property of properties) {
                const propName = property[0];
                const propValue = <any>property[1];

                if (propName === imagePropertyName) {
                    // Make sure the main image is always first in the array.
                    imageLinks.unshift(propValue);
                    continue;
                }

                if (propName === imagesPropertyName) {
                    for (const val of propValue) {
                        imageLinks.push(val);
                    }
                    continue;
                }

                if (excludedProperties.includes(propName)) {
                    continue;
                }

                const row = body.createEl("tr");
                const propNameCell = row.createEl("td", { text: propName });

                if (this.plugin.settings.capitalizePropertyName) {
                    propNameCell.style.textTransform = "capitalize";
                }

                const valueCell = row.createEl("td");

                if (this.isUrl(propValue)) {
                    const link = valueCell.createEl("a", { text: propValue.split("/").last() });
                    link.href = propValue;
                } else {
                    if (activeFile) {
                        this.setEditableText(propName, propValue, activeFile, valueCell);
                    }
                }
            }

            if (imageLinks.length) {
                const img = imgPanel.createEl("img", { cls: "main-image" });
                let curIdx = 0;

                this.setImage(imageLinks[curIdx], img);

                if (imageLinks.length > 1) {
                    const leftArrow = imgPanel.createEl("button", { text: "Previous", cls: "prev-btn" });
                    const rightArrow = imgPanel.createEl("button", { text: "Next", cls: "next-btn" });

                    leftArrow.addEventListener("click", () => {
                        curIdx = (curIdx > 0) ? curIdx - 1 : imageLinks.length - 1;
                        this.setImageFromClick(imageLinks[curIdx], img);
                    });

                    rightArrow.addEventListener("click", () => {
                        curIdx = (curIdx < imageLinks.length - 1) ? curIdx + 1 : 0;
                        this.setImageFromClick(imageLinks[curIdx], img);
                    });
                }
            } else {
                imgPanel.remove();
            }
        } else {
            this.setNoContentMessage();
        }
    }

    /*
    Takes nested yamml like this:
    ```
        image: name.jpg
        nested:
            - child1:
                - grandchild1: bobby
                - grandchild2: alice
            - child2: greg
    ```
        
    Which comes through in the frontmatter as this:
    {"image":"name.jpg","nested":[{"child1":[{"grandchild1":"bobby"},{"grandchild2":"alice"}]},{"child2":"greg"}]}
    
    And turns it into this:
    {
        "image": "name.jpg",
        "nested.child1.grandchild1": "bobby",
        "nested.child1.grandchild2": "alice",
        "nested.child2"" "greg",
    }
     */
    flattenObject(
        obj: any,
        parentKey: string = '',
        result: { [key: string]: any } = {}
    ): { [key: string]: any } {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = parentKey ? `${parentKey}${this.plugin.settings.nestedYamlSeparator}${key}` : key;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.flattenObject(value, fullKey, result);
            } else if (Array.isArray(value)) {
                value.forEach((val) => {
                    if (typeof val === 'object') {
                        this.flattenObject(val, fullKey, result);
                    } else {
                        result[fullKey] = val;
                    }
                });
            } else {
                result[fullKey] = value;
            }
        }
        return result;
    }

    // This sets values on nested yaml objects.
    updateFrontmatter(obj: any, path: string, value: string): any {
        const keys = path.split(this.plugin.settings.nestedYamlSeparator);
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            // Assuming keys represent an array index if it is purely numeric
            const key = isNaN(+keys[i]) ? keys[i] : parseInt(keys[i], 10);
            if (key in current) {
                if (Array.isArray(current[key])) {
                    // The next key should be an index if we are looking at an array
                    const nextKey = isNaN(+keys[i + 1]) ? keys[i + 1] : parseInt(keys[i + 1], 10);
                    current = current[key].find(item => nextKey in item);
                } else {
                    current = current[key];
                }
            } else {
                console.error('Invalid path');
                return obj;
            }
        }

        if (Array.isArray(current)) {
            const lastKeyIndex = isNaN(+keys[keys.length - 1]) ? keys[keys.length - 1] : parseInt(keys[keys.length - 1], 10);
            let foundIndex = current.findIndex(item => lastKeyIndex in item);
            if (foundIndex !== -1) {
                current[foundIndex][lastKeyIndex] = value;
            }

        } else {
            // Set the value at the last key
            const lastKey = keys[keys.length - 1];
            current[lastKey] = value;
        }

        return obj;
    }

    isUrl(str: string) {
        return /^(https?:\/\/).+/i.exec(str);
    }

    // This uses 'lastActiveFile', which isn't documented. But it's necessary for the case
    // where the user switches to a different sidebar view and then back to the infobox.
    tryGetActiveFile(): TFile | undefined {
        let activeFile = this.app.workspace.lastActiveFile;

        if (!activeFile) {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

            if (activeView && activeView.file) {
                activeFile = activeView.file;
            }
        }

        return activeFile;
    }

    setEditableText(
        propName: string,
        propValue: string,
        activeFile: TFile,
        tableCell: HTMLTableCellElement) {
        // Using an editable div because it auto sizes to the text inside of it,
        // unlike a TextArea that takes a lot more work to do the same.
        const input = tableCell.createDiv({
            text: propValue,
            cls: "sidebar-infobox-edit-box",
            attr: { "contenteditable": "" }
        });

        // Configuration for observing textual changes
        const config = {
            childList: true,
            subtree: true,
            characterData: true,
        };

        const observer = new MutationObserver(
            debounce(
                (mutations: MutationRecord[]) => {
                    for (const mutation of mutations) {
                        // Handle typing into the div.
                        if (mutation.type === "characterData") {
                            this.app.fileManager.processFrontMatter(activeFile, (fm: FrontMatterCache) => {
                                if (mutation.target.textContent) {
                                    this.updateFrontmatter(fm, propName, mutation.target.textContent);
                                }
                            });
                        }

                        // Handle pasting into the div.
                        if (mutation.type === "childList") {
                            this.app.fileManager.processFrontMatter(activeFile, (fm: FrontMatterCache) => {
                                fm[propName] = mutation.target.textContent;
                            });
                            break;
                        }
                    }
                },
                500,
                true
            )
        );

        this.observers.push(observer);
        observer.observe(input, config);
    }

    setImageFromClick(fileName: string, img: HTMLImageElement) {
        // We don't want the 'active-leaf-change' event to reset the image after 
        // the button click, since clicking on it also selecs the infobox panel
        // and registers as a leaf change.
        this.internalViewChange = true;

        this.setImage(fileName, img);

        // Reset after a slight delay to account for the debounce time in the
        // 'active-leaf-change' event handler.
        setTimeout(() => {
            this.internalViewChange = false;
        }, 200);
    }

    setImage(fileName: string, img: HTMLImageElement) {
        // See if this is using link format and extract the name if so.
        if (fileName.includes("[[")) {
            const imageFileMatch = /!?\[\[(?<filename>.+)\]\]/.exec(fileName);
            fileName = imageFileMatch?.groups?.filename || "";
        }

        if (!fileName) return;

        new Promise<TFile>((resolve, reject) => {
            const imageFile = this.app.vault.getFiles()
                .find(f => f.name === fileName);

            let maxHeight = DEFAULT_SETTINGS.maxImageHeight.toString() + "px";

            if (this.plugin.settings.maxImageHeight === 0) {
                maxHeight = "none";
            } else if (this.plugin.settings.maxImageHeight) {
                maxHeight = this.plugin.settings.maxImageHeight.toString() + "px";
            }

            img.style.maxHeight = maxHeight;

            if (imageFile) {
                resolve(imageFile);
            } else {
                reject("Can't locate image file.")
            }

        })
            .then((imageFile) => {
                const file = this.app.vault.adapter.getResourcePath(imageFile.path);
                img.src = file;
            })
            .catch((message: string) => {
                img.remove();
                console.log(`Sidebar Infobox: ${message}`)
            });
    }

    setNoContentMessage() {
        this.contentEl.empty();
        this.contentEl.createDiv({
            cls: "pane-empty",
            text: "Nothing to display.",
        });

    }

    disconnectObservers() {
        // Disconnect and clear out current observers.
        for (const observer of this.observers) {
            observer.disconnect();
            this.observers = [];
        }
    }

    getViewType() {
        return viewType;
    }

    getDisplayText() {
        return "Sidebar Infobox";
    }

    getIcon() {
        return "lines-of-text";
    }

    async onClose() {
        this.disconnectObservers();
        await super.onClose();
    }
}