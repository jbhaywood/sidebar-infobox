import SidebarInfobox from "./main";
import {
    App,
    PluginSettingTab,
    Setting
} from "obsidian";

export interface SidebarInfoboxSettings {
    imageProperty: string,
    imagesProperty: string,
    excludeProperties: string,
    maxImageHeight: Number;
    sortProperties: boolean;
    capitalizePropertyName: boolean;
}

export const DEFAULT_SETTINGS: SidebarInfoboxSettings = {
    imageProperty: "image",
    imagesProperty: "images",
    excludeProperties: "",
    maxImageHeight: 500,
    sortProperties: false,
    capitalizePropertyName: false
}

export class SidebarInfoboxSettingTab extends PluginSettingTab {
    plugin: SidebarInfobox;

    constructor(app: App, plugin: SidebarInfobox) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Maximum Image Height")
            .setDesc("Value in pixels. Set to zero for no maximum.")
            .addText(text => text
                .setPlaceholder(DEFAULT_SETTINGS.maxImageHeight.toString())
                .setValue(this.plugin.settings.maxImageHeight?.toString())
                .onChange(async (value) => {
                    this.plugin.settings.maxImageHeight = parseInt(value);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Image Property")
            .setDesc("The name of the frontmatter property to use for the main image shown above the properties table. It should be the name of the image file located somewhere in the vault.")
            .addText(text => text
                .setPlaceholder(DEFAULT_SETTINGS.imageProperty)
                .setValue(this.plugin.settings.imageProperty)
                .onChange(async (value) => {
                    this.plugin.settings.imageProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Images Property")
            .setDesc("The name of the frontmatter property to use for additional images. This is an array property, with each value being the name of the image file located somewhere in the vault.")
            .addText(text => text
                .setPlaceholder(DEFAULT_SETTINGS.imagesProperty)
                .setValue(this.plugin.settings.imagesProperty)
                .onChange(async (value) => {
                    this.plugin.settings.imagesProperty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Excluded Properties")
            .setDesc("The names of the frontmatter properties to exclude from the table. List them all on one line, with each followed by a comma.")
            .addTextArea(text => text
                .setValue(this.plugin.settings.excludeProperties)
                .onChange(async (value) => {
                    this.plugin.settings.excludeProperties = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Sort Properties")
            .setDesc("Whether or not to sort the properties alphabetically in the table.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.sortProperties)
                .onChange(async (value) => {
                    this.plugin.settings.sortProperties = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Capitalize Property Names")
            .setDesc("Whether or not to capitalize the property names.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.capitalizePropertyName)
                .onChange(async (value) => {
                    this.plugin.settings.capitalizePropertyName = value;
                    await this.plugin.saveSettings();
                }));
    }
}
