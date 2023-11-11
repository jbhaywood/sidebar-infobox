import {
	MarkdownView,
	Plugin,
	WorkspaceLeaf,
	debounce
} from 'obsidian';

import {
	SidebarInfoboxView,
	viewType
} from './view';

import {
	SidebarInfoboxSettings,
	SidebarInfoboxSettingTab,
	DEFAULT_SETTINGS
} from "./settings"

export default class SidebarInfobox extends Plugin {
	settings: SidebarInfoboxSettings;
	lastActiveView: MarkdownView | undefined;

	async onload() {
		const { app } = this;

		await this.loadSettings();

		this.registerView(
			viewType,
			(leaf: WorkspaceLeaf) => new SidebarInfoboxView(leaf, this)
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SidebarInfoboxSettingTab(this.app, this));

		this.addCommand({
			id: 'show-sidebar-infobox',
			name: 'Show Sidebar Infobox',
			callback: async () => {
				this.initLeaf();
			},
		});

		this.registerEvent(
			app.metadataCache.on(
				'changed',
				debounce(
					(file) => {
						const activeView = app.workspace.getActiveViewOfType(MarkdownView);

						if (activeView && file === activeView.file) {
							this.view?.setViewContent();
						}
					},
					100,
					true
				)
			)
		);

		this.registerEvent(
			app.workspace.on(
				'active-leaf-change',
				debounce(
					() => {
						if (!this.view?.internalViewChange) {
							this.view?.setViewContent();
						}
					},
					100,
					true
				)
			)
		);

		(async () => {
			await this.initLeaf();
		})();
	}

	onunload() {
		this.app.workspace
			.getLeavesOfType(viewType)
			.forEach((leaf) => leaf.detach());
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	get view() {
		const leaves = this.app.workspace.getLeavesOfType(viewType);
		if (!leaves?.length) return null;
		return leaves[0].view as SidebarInfoboxView;
	}

	async initLeaf() {
		if (this.view) return this.revealLeaf();

		if (this.app.workspace) {
			await this.app.workspace.getRightLeaf(false).setViewState({
				type: viewType,
			});

			this.revealLeaf();
		}
	}

	revealLeaf() {
		const leaves = this.app.workspace.getLeavesOfType(viewType);
		if (!leaves?.length) return;

		this.app.workspace.revealLeaf(leaves[0]);

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (activeView) {
			this.view?.setViewContent();
		}
	}
}