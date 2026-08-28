import { App, Plugin, PluginSettingTab, Setting, Notice } from "obsidian";
import { getCurrentWindow } from "@electron/remote";
import type { BrowserWindow } from "electron";

// Opacity preset options
const OPACITY_PRESETS: Record<string, number> = {
	"Opaque (100%)": 1.0,
	"Barely there (95%)": 0.95,
	"Light (90%)": 0.9,
	"Medium (80%)": 0.8,
	"Heavy (70%)": 0.7,
};

interface PinOnTopSettings {
	alwaysOnTop: boolean;
	opacity: number;
}

const DEFAULT_SETTINGS: PinOnTopSettings = {
	alwaysOnTop: false,
	opacity: 1.0,
};

/**
 * Returns the Electron BrowserWindow for the current Obsidian window, or null.
 *
 * Modern Obsidian ships and initializes the `@electron/remote` package, so we
 * use its typed `getCurrentWindow()` helper. If remote access is unavailable
 * we return null and the caller surfaces a one-time notice.
 */
function getWindow(): BrowserWindow | null {
	try {
		return getCurrentWindow();
	} catch {
		return null;
	}
}

export default class PinOnTopPlugin extends Plugin {
	settings: PinOnTopSettings;
	ribbonIconEl: HTMLElement | null = null;
	private warnedNoWindow = false;

	async onload() {
		await this.loadSettings();

		// Ribbon icon — acts as toggle
		this.ribbonIconEl = this.addRibbonIcon("pin", "Toggle pin on top", () => {
			this.toggleAlwaysOnTop();
		});

		this.updateRibbonIcon();

		// Command: toggle always on top
		this.addCommand({
			id: "toggle-always-on-top",
			name: "Toggle always on top",
			callback: () => {
				this.toggleAlwaysOnTop();
			},
		});

		// Command: cycle through opacity presets
		this.addCommand({
			id: "cycle-opacity-preset",
			name: "Cycle opacity preset",
			callback: () => {
				this.cycleOpacityPreset();
			},
		});

		// Apply saved state on load
		this.applyWindowState();

		// Settings tab
		this.addSettingTab(new PinOnTopSettingTab(this.app, this));
	}

	onunload() {
		// Restore full opacity and disable always-on-top when the plugin unloads
		const win = getWindow();
		if (win) {
			win.setAlwaysOnTop(false);
			win.setOpacity(1.0);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<PinOnTopSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** Returns the window, warning the user once if it can't be reached. */
	private requireWindow(): BrowserWindow | null {
		const win = getWindow();
		if (!win && !this.warnedNoWindow) {
			this.warnedNoWindow = true;
			new Notice(
				"Pin on Top: couldn't access the window. This Electron version may not be supported."
			);
			console.error("Pin on Top: no Electron window handle available.");
		}
		return win;
	}

	applyWindowState() {
		const win = this.requireWindow();
		if (!win) return;
		win.setAlwaysOnTop(this.settings.alwaysOnTop);
		// Translucency applies only while pinned; restore full opacity when unpinned.
		win.setOpacity(this.settings.alwaysOnTop ? this.settings.opacity : 1.0);
	}

	toggleAlwaysOnTop() {
		this.settings.alwaysOnTop = !this.settings.alwaysOnTop;
		const win = this.requireWindow();
		if (win) {
			win.setAlwaysOnTop(this.settings.alwaysOnTop);
			// Apply the chosen translucency when pinning; go fully opaque when unpinning.
			win.setOpacity(this.settings.alwaysOnTop ? this.settings.opacity : 1.0);
		}
		this.updateRibbonIcon();
		void this.saveSettings();
		new Notice(
			this.settings.alwaysOnTop
				? "Window is now pinned on top"
				: "Window is no longer pinned on top"
		);
	}

	setOpacity(value: number) {
		this.settings.opacity = value;
		const win = this.requireWindow();
		// Only reflect the change live while pinned; when unpinned the window stays
		// fully opaque and this value is remembered for the next time it's pinned.
		if (win && this.settings.alwaysOnTop) {
			win.setOpacity(value);
		}
		void this.saveSettings();
	}

	cycleOpacityPreset() {
		const presetValues = Object.values(OPACITY_PRESETS);
		const presetNames = Object.keys(OPACITY_PRESETS);
		const currentIndex = presetValues.findIndex(
			(v) => Math.abs(v - this.settings.opacity) < 0.01
		);
		const nextIndex = (currentIndex + 1) % presetValues.length;
		const nextValue = presetValues[nextIndex];
		this.setOpacity(nextValue);
		new Notice(`Opacity: ${presetNames[nextIndex]}`);
	}

	updateRibbonIcon() {
		if (!this.ribbonIconEl) return;
		if (this.settings.alwaysOnTop) {
			this.ribbonIconEl.addClass("pin-on-top-active");
			this.ribbonIconEl.setAttribute("aria-label", "Pin on Top: on — click to disable");
		} else {
			this.ribbonIconEl.removeClass("pin-on-top-active");
			this.ribbonIconEl.setAttribute("aria-label", "Pin on Top: off — click to enable");
		}
	}
}

class PinOnTopSettingTab extends PluginSettingTab {
	plugin: PinOnTopPlugin;

	constructor(app: App, plugin: PinOnTopPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Always on top toggle
		new Setting(containerEl)
			.setName("Always on top")
			.setDesc("Keep this window above all other windows.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.alwaysOnTop).onChange(async (value) => {
					this.plugin.settings.alwaysOnTop = value;
					const win = getWindow();
					if (win) {
						win.setAlwaysOnTop(value);
						// Translucency only while pinned; opaque when unpinned.
						win.setOpacity(value ? this.plugin.settings.opacity : 1.0);
					}
					this.plugin.updateRibbonIcon();
					await this.plugin.saveSettings();
				})
			);

		// Opacity section
		new Setting(containerEl).setName("Translucency").setHeading();

		let sliderEl: HTMLInputElement;
		let sliderValueEl: HTMLSpanElement;

		// Preset dropdown
		new Setting(containerEl)
			.setName("Opacity preset")
			.setDesc("Quick-select a common opacity level.")
			.addDropdown((dropdown) => {
				Object.entries(OPACITY_PRESETS).forEach(([label, value]) => {
					dropdown.addOption(String(value), label);
				});

				// Set current value — find nearest preset or default to opaque
				const match = Object.entries(OPACITY_PRESETS).find(
					([, v]) => Math.abs(v - this.plugin.settings.opacity) < 0.01
				);
				dropdown.setValue(
					match ? String(match[1]) : String(OPACITY_PRESETS["Opaque (100%)"])
				);

				dropdown.onChange(async (value) => {
					const opacity = parseFloat(value);
					this.plugin.setOpacity(opacity);
					// Keep the slider in sync
					if (sliderEl) sliderEl.value = String(Math.round(opacity * 100));
					if (sliderValueEl) sliderValueEl.textContent = `${Math.round(opacity * 100)}%`;
				});
			});

		// Fine-grained slider
		const sliderSetting = new Setting(containerEl)
			.setName("Fine-tune opacity")
			.setDesc("Drag — or use −/+ — to set a custom opacity level (50–100%).");

		// Nudge opacity by ±1 percentage point, clamped to the slider's 50–100% range.
		const nudgeOpacity = (deltaPct: number) => {
			const pct = Math.round(this.plugin.settings.opacity * 100);
			const next = Math.min(100, Math.max(50, pct + deltaPct));
			if (next === pct) return; // already at a bound — no-op
			const opacity = next / 100;
			this.plugin.setOpacity(opacity);
			if (sliderEl) sliderEl.value = String(next);
			if (sliderValueEl) sliderValueEl.textContent = `${next}%`;
		};

		// Decrease (−) button — sits before the slider.
		sliderSetting.addExtraButton((btn) =>
			btn
				.setIcon("minus")
				.setTooltip("Decrease opacity 1%")
				.onClick(() => nudgeOpacity(-1))
		);

		sliderSetting.addSlider((slider) => {
			sliderEl = slider.sliderEl;
			slider
				.setLimits(50, 100, 1)
				.setValue(Math.round(this.plugin.settings.opacity * 100))
				.onChange(async (value) => {
					const opacity = value / 100;
					this.plugin.setOpacity(opacity);
					if (sliderValueEl) sliderValueEl.textContent = `${value}%`;
				});
		});

		// Increase (+) button — sits after the slider.
		sliderSetting.addExtraButton((btn) =>
			btn
				.setIcon("plus")
				.setTooltip("Increase opacity 1%")
				.onClick(() => nudgeOpacity(1))
		);

		// Value label next to the slider
		sliderValueEl = sliderSetting.controlEl.createSpan({
			text: `${Math.round(this.plugin.settings.opacity * 100)}%`,
			cls: "pin-on-top-slider-value",
		});
	}
}
