import type {ModSlot, WeaponPreset, WeaponPresetItem, WeaponPresetsFile} from '../types/weapon-preset';

import {MOD_SLOTS} from '../types/weapon-preset';
import {downloadJson, generateId, readJsonFile} from '../utils/helpers';

export class WeaponBuilder {
    private static readonly STORAGE_KEY = 'spt-quest-builder-weapons';
    public get hasCurrentPreset(): boolean {
        return !!this.currentPresetId;
    }
    public get hasPresets(): boolean {
        return Object.keys(this.presets).length > 0;
    }
    private container: HTMLElement;
    private currentPresetId: null | string = null;

    private editingPartId: null | string = null;

    private presets: WeaponPresetsFile = {};

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) || this.createContainer();
        this.loadFromStorage();
        this.render();
        this.bindEvents();
        // Initialize field states based on checkbox
        const isBaseChecked = (document.getElementById('isBaseWeapon') as HTMLInputElement)?.checked ?? true;
        this.updateFieldStates(isBaseChecked);
    }

    public exportCurrentPreset(): void {
        if (!this.currentPresetId) {
            alert('No preset selected. Select a weapon preset to export.');
            return;
        }

        const preset = this.presets[this.currentPresetId];
        if (!preset) {
            alert('Selected preset not found.');
            return;
        }

        const exportData: WeaponPresetsFile = {[this.currentPresetId]: preset};
        const filename = `${preset._name.replace(/[^a-zA-Z0-9]/g, '_')}_preset.json`;

        downloadJson(exportData, filename);
        this.showToast(`Exported: ${preset._name}`);
    }

    public async exportPresets(): Promise<void> {
        if (Object.keys(this.presets).length === 0) {
            alert('No weapon presets to export');
            return;
        }

        downloadJson(this.presets, 'weaponpresets.json');
        this.showToast('Weapon presets exported');
    }

    public async importPresets(file: File): Promise<void> {
        try {
            const data = await readJsonFile<WeaponPresetsFile>(file);
            this.presets = data;
            this.currentPresetId = null;
            this.renderPresetsList();
            this.renderPartsList();
            this.saveToStorage();
            this.showToast('Weapon presets imported successfully');
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import weapon presets. Please check the file format.');
        }
    }

    public render(): void {
        this.container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Presets List Sidebar -->
                <aside class="lg:col-span-1">
                    <div class="panel">
                        <div class="flex items-center justify-between">
                            <h2 class="text-lg font-semibold">Presets</h2>
                            <button type="button" id="newPresetBtn" class="btn btn-primary text-sm">+ New</button>
                        </div>
                        <div id="presetsList" class="space-y-1 max-h-[60vh] overflow-y-auto empty:hidden mt-4">
                        </div>
                    </div>
                </aside>

                <!-- Main Content -->
                <section class="lg:col-span-3">
                    <div class="panel">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-lg font-semibold">Weapon Preset Details</h2>
                        </div>

                        <!-- Preset Info -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div class="form-group">
                                <label for="presetName">Preset Name</label>
                                <input type="text" id="presetName" name="presetName" class="w-full" placeholder="e.g., My Custom M4" disabled />
                            </div>
                            <div class="form-group">
                                <label for="baseWeaponId">Base Weapon Item ID</label>
                                <input type="text" id="baseWeaponId" name="baseWeaponId" class="w-full" placeholder="e.g., 5447a9cd4bdc2dbd208b4567" disabled />
                                <p class="text-xs text-tarkov-text-muted mt-1">The item ID for the base weapon (e.g., lower receiver)</p>
                            </div>
                        </div>

                        <!-- Add Part Form -->
                        <form id="weaponPartForm">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <!-- Base Weapon Checkbox -->
                                <div class="form-group md:col-span-2">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="isBaseWeapon" name="isBaseWeapon" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent focus:ring-tarkov-accent" checked />
                                        <span class="text-sm">Base Weapon?</span>
                                        <span class="text-xs text-tarkov-text-muted" title="Is this the first part of an entire weapon? Use the lower receiver to begin.">
                                            ℹ️ First part of weapon (use lower receiver)
                                        </span>
                                    </label>
                                </div>

                                <!-- Weapon Name -->
                                <div class="form-group md:col-span-2">
                                    <label for="weaponName">Weapon Name</label>
                                    <input type="text" id="weaponName" name="weaponName" class="w-full" placeholder="e.g., My Custom M4" disabled />
                                    <p class="text-xs text-tarkov-text-muted mt-1">Only required when "Base Weapon" is checked</p>
                                </div>

                                <!-- Item ID -->
                                <div class="form-group md:col-span-2">
                                    <label for="itemId">Item ID</label>
                                    <input type="text" id="itemId" name="itemId" class="w-full" placeholder="e.g., 5447a9cd4bdc2dbd208b4567" required />
                                </div>

                                <!-- Parent ID -->
                                <div class="form-group">
                                    <label for="parentId">Parent ID</label>
                                    <input type="text" id="parentId" name="parentId" class="w-full" placeholder="Parent part ID" />
                                </div>

                                <!-- Mod Slot -->
                                <div class="form-group">
                                    <label for="modSlot">Mod Slot</label>
                                    <select id="modSlot" name="modSlot" class="w-full">
                                        ${MOD_SLOTS.map(slot => `<option value="${slot}">${slot}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="flex gap-2 mb-6">
                                <button type="submit" id="addPartBtn" class="btn btn-primary text-sm" disabled>Add Part</button>
                                <button type="button" id="cancelEditPartBtn" class="btn btn-secondary text-sm hidden">Cancel</button>
                            </div>
                        </form>

                        <!-- Parts List -->
                        <div class="bg-tarkov-bg border border-tarkov-border rounded-lg p-4">
                            <h3 class="font-semibold mb-3">Weapon Parts</h3>
                            <div id="partsList" class="space-y-2 text-sm text-tarkov-text-muted">
                                <p>Select a preset to view its parts</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;

        this.renderPresetsList();
        this.renderPartsList();
    }

    private addOrUpdatePart(): void {
        const form = document.getElementById('weaponPartForm') as HTMLFormElement;
        const formData = new FormData(form);

        const isBaseWeapon = (document.getElementById('isBaseWeapon') as HTMLInputElement).checked;
        const weaponName = formData.get('weaponName') as string;
        const itemId = formData.get('itemId') as string;
        const parentId = formData.get('parentId') as string;
        const modSlot = formData.get('modSlot') as ModSlot;

        if (!itemId) {
            alert('Item ID is required');
            return;
        }

        if (!this.currentPresetId) {
            alert('No preset selected. This should not happen.');
            return;
        }

        const preset = this.presets[this.currentPresetId];
        if (!preset) return;

        if (this.editingPartId) {
            // Update existing part
            const partIndex = preset._items.findIndex(p => p._id === this.editingPartId);
            if (partIndex !== -1) {
                preset._items[partIndex]._tpl = itemId;
                preset._items[partIndex].parentId = parentId || undefined;
                preset._items[partIndex].slotId = modSlot || undefined;
            }
            this.editingPartId = null;
        } else {
            // Add new part
            const newPart: WeaponPresetItem = {
                _id : generateId(),
                _tpl: itemId,
            };

            if (parentId) {
                newPart.parentId = parentId;
            }
            if (modSlot) {
                newPart.slotId = modSlot;
            }

            preset._items.push(newPart);
        }

        // Update preset metadata if base weapon
        if (isBaseWeapon && weaponName) {
            preset._name = weaponName;
            preset._changeWeaponName = true;
        }

        this.renderPartsList();
        this.saveToStorage();
        form.reset();
        // Reset the add part button text
        const addPartBtn = document.getElementById('addPartBtn');
        if (addPartBtn) addPartBtn.textContent = 'Add Part';
        document.getElementById('cancelEditPartBtn')?.classList.add('hidden');
    }

    private bindEvents(): void {
        // New preset button - create with defaults
        document.getElementById('newPresetBtn')?.addEventListener('click', () => this.createNewPreset());

        // Preset name change
        document.getElementById('presetName')?.addEventListener('change', (e) => {
            this.updatePresetName((e.target as HTMLInputElement).value);
        });

        // Base weapon ID change
        document.getElementById('baseWeaponId')?.addEventListener('change', (e) => {
            this.updateBaseWeaponId((e.target as HTMLInputElement).value);
        });

        // Base weapon checkbox toggle
        document.getElementById('isBaseWeapon')?.addEventListener('change', (e) => {
            const isChecked = (e.target as HTMLInputElement).checked;
            this.updateFieldStates(isChecked);
        });

        // Part form submission
        document.getElementById('weaponPartForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addOrUpdatePart();
        });

        // Cancel edit button
        document.getElementById('cancelEditPartBtn')?.addEventListener('click', () => {
            this.editingPartId = null;
            (document.getElementById('weaponPartForm') as HTMLFormElement).reset();
            const addPartBtn = document.getElementById('addPartBtn');
            if (addPartBtn) addPartBtn.textContent = 'Add Part';
            document.getElementById('cancelEditPartBtn')?.classList.add('hidden');
        });

        // Preset selection
        document.getElementById('presetsList')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Handle delete button
            if (target.classList.contains('preset-delete-btn')) {
                e.stopPropagation();
                const presetId = target.dataset.id;
                if (presetId) this.deletePreset(presetId);
                return;
            }

            // Handle preset selection
            const presetItem = target.closest('.preset-item') as HTMLElement;
            if (presetItem?.dataset.id) {
                this.selectPreset(presetItem.dataset.id);
            }
        });

        // Parts list actions
        document.getElementById('partsList')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const partId = target.dataset.id;

            if (!partId) return;

            if (target.classList.contains('part-edit-btn')) {
                this.editPart(partId);
            } else if (target.classList.contains('part-delete-btn')) {
                this.deletePart(partId);
            }
        });
    }

    private clearPresetForm(): void {
        const nameInput = document.getElementById('presetName') as HTMLInputElement;
        const baseIdInput = document.getElementById('baseWeaponId') as HTMLInputElement;

        if (nameInput) {
            nameInput.value = '';
            nameInput.disabled = true;
        }
        if (baseIdInput) {
            baseIdInput.value = '';
            baseIdInput.disabled = true;
        }
    }

    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'weaponBuilderContainer';
        document.body.appendChild(container);
        return container;
    }

    private createNewPreset(): void {
        const presetId = generateId();
        const defaultBaseItemId = '5447a9cd4bdc2dbd208b4567'; // Default M4A1 lower receiver

        const newPreset: WeaponPreset = {
            _changeWeaponName: true,
            _id              : presetId,
            _items           : [],
            _name            : 'New Weapon Preset',
            _parent          : defaultBaseItemId,
            _type            : 'Preset',
        };

        this.presets[presetId] = newPreset;
        this.currentPresetId = presetId;

        this.renderPresetsList();
        this.renderPartsList();
        this.populatePresetForm(newPreset);
        this.saveToStorage();
        this.showToast('Created new preset');

        // Focus the name field
        (document.getElementById('presetName') as HTMLInputElement)?.focus();
    }

    private deletePart(partId: string): void {
        if (!this.currentPresetId) return;

        const preset = this.presets[this.currentPresetId];
        if (!preset) return;

        if (confirm('Are you sure you want to delete this part?')) {
            preset._items = preset._items.filter(p => p._id !== partId);
            this.renderPartsList();
            this.saveToStorage();
            this.showToast('Part deleted');
        }
    }

    private deletePreset(presetId: string): void {
        const preset = this.presets[presetId];
        if (!preset) return;

        if (confirm(`Are you sure you want to delete preset "${preset._name}"?`)) {
            delete this.presets[presetId];

            if (this.currentPresetId === presetId) {
                this.currentPresetId = null;
                this.clearPresetForm();
            }

            this.renderPresetsList();
            this.renderPartsList();
            this.updateAddPartButton();
            this.saveToStorage();
            this.showToast('Preset deleted');
        }
    }

    private editPart(partId: string): void {
        if (!this.currentPresetId) return;

        const preset = this.presets[this.currentPresetId];
        if (!preset) return;

        const part = preset._items.find(p => p._id === partId);
        if (!part) return;

        this.editingPartId = partId;

        // Populate form
        (document.getElementById('itemId') as HTMLInputElement).value = part._tpl;
        (document.getElementById('parentId') as HTMLInputElement).value = part.parentId || '';
        (document.getElementById('modSlot') as HTMLSelectElement).value = part.slotId || '';

        // Check if this is the base weapon (first item)
        const isBase = preset._items[0]._id === partId;
        const isBaseCheckbox = document.getElementById('isBaseWeapon') as HTMLInputElement;
        isBaseCheckbox.checked = isBase;
        (document.getElementById('weaponName') as HTMLInputElement).value = isBase ? preset._name : '';

        // Trigger the change event to update field states
        this.updateFieldStates(isBase);

        const addPartBtn = document.getElementById('addPartBtn');
        if (addPartBtn) addPartBtn.textContent = 'Update Part';
        document.getElementById('cancelEditPartBtn')?.classList.remove('hidden');
        const form = document.getElementById('weaponPartForm');
        if (form) form.scrollIntoView({behavior: 'smooth'});
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(WeaponBuilder.STORAGE_KEY);
            if (stored) {
                this.presets = JSON.parse(stored);
            }
        } catch (err) {
            console.error('Failed to load weapon presets from storage:', err);
        }
    }

    private populatePresetForm(preset: WeaponPreset): void {
        const nameInput = document.getElementById('presetName') as HTMLInputElement;
        const baseIdInput = document.getElementById('baseWeaponId') as HTMLInputElement;

        if (nameInput) {
            nameInput.value = preset._name;
            nameInput.disabled = false;
        }
        if (baseIdInput) {
            baseIdInput.value = preset._parent;
            baseIdInput.disabled = false;
        }
    }

    private renderPartsList(): void {
        const container = document.getElementById('partsList');
        if (!container) return;

        if (!this.currentPresetId) {
            container.innerHTML = '<p class="text-sm text-tarkov-text-muted">Select a preset to view its parts</p>';
            return;
        }

        const preset = this.presets[this.currentPresetId];
        if (!preset || preset._items.length === 0) {
            container.innerHTML = '<p class="text-sm text-tarkov-text-muted">No parts added yet</p>';
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Item ID</th>
                            <th>Parent ID</th>
                            <th>Slot</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${preset._items.map((part, index) => {
                            const isBase = index === 0;
                            return `
                                <tr>
                                    <td>
                                        ${isBase ? `<strong>${preset._name}</strong>` : `Part ${index + 1}`}
                                        ${isBase ? '<span class="badge-accent">(Base)</span>' : ''}
                                    </td>
                                    <td class="font-mono text-xs">${part._tpl}</td>
                                    <td class="font-mono text-xs">${part.parentId || '-'}</td>
                                    <td class="text-xs">${part.slotId || '-'}</td>
                                    <td class="text-right">
                                        <span class="actions justify-end">
                                            <button class="part-edit-btn action-link" data-id="${part._id}">Edit</button>
                                            <button class="part-delete-btn icon-btn-delete" data-id="${part._id}">&times;</button>
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    private renderPresetsList(): void {
        const container = document.getElementById('presetsList');
        if (!container) return;

        const presetIds = Object.keys(this.presets);
        if (presetIds.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = presetIds.map(id => {
            const preset = this.presets[id];
            const isSelected = this.currentPresetId === id;
            return `
                <div class="preset-item list-item group ${isSelected ? 'selected' : ''}"
                     data-id="${id}">
                    <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">${preset._name}</div>
                        <div class="text-xs ${isSelected ? 'text-tarkov-bg/70' : 'text-tarkov-text-muted'}">${preset._items.length} parts</div>
                    </div>
                    <button class="preset-delete-btn icon-btn-delete sm:opacity-0 sm:group-hover:opacity-100 ${isSelected ? '!text-tarkov-bg hover:!text-red-900 hover:!bg-tarkov-bg/20' : ''}" data-id="${id}">&times;</button>
                </div>
            `;
        }).join('');
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(WeaponBuilder.STORAGE_KEY, JSON.stringify(this.presets));
        } catch (err) {
            console.error('Failed to save weapon presets to storage:', err);
        }
    }

    private selectPreset(presetId: string): void {
        this.currentPresetId = presetId;
        this.editingPartId = null;

        const preset = this.presets[presetId];
        if (preset) {
            this.populatePresetForm(preset);
        }

        this.renderPresetsList();
        this.renderPartsList();
        this.updateAddPartButton();
        (document.getElementById('weaponPartForm') as HTMLFormElement).reset();
        const addPartBtn = document.getElementById('addPartBtn');
        if (addPartBtn) addPartBtn.textContent = 'Add Part';
        document.getElementById('cancelEditPartBtn')?.classList.add('hidden');
    }

    private showToast(message: string): void {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');
            setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0');
            }, 3000);
        }
    }

    private updateAddPartButton(): void {
        const addPartBtn = document.getElementById('addPartBtn') as HTMLButtonElement;
        if (addPartBtn) {
            addPartBtn.disabled = !this.currentPresetId;
        }
    }

    private updateBaseWeaponId(itemId: string): void {
        if (!this.currentPresetId) return;
        const preset = this.presets[this.currentPresetId];
        if (!preset) return;

        const trimmedId = itemId.trim();
        if (!trimmedId) return;

        preset._parent = trimmedId;
        // Update the first item's _tpl as well
        if (preset._items.length > 0) {
            preset._items[0]._tpl = trimmedId;
        }
        this.renderPartsList();
        this.saveToStorage();
    }

    private updateFieldStates(isBaseWeapon: boolean): void {
        const weaponNameInput = document.getElementById('weaponName') as HTMLInputElement;
        const parentIdInput = document.getElementById('parentId') as HTMLInputElement;
        const modSlotSelect = document.getElementById('modSlot') as HTMLSelectElement;

        if (weaponNameInput) {
            weaponNameInput.disabled = !isBaseWeapon;
            if (!isBaseWeapon) {
                weaponNameInput.value = '';
            }
        }

        if (parentIdInput) {
            parentIdInput.disabled = isBaseWeapon;
            if (isBaseWeapon) {
                parentIdInput.value = '';
            }
        }

        if (modSlotSelect) {
            modSlotSelect.disabled = isBaseWeapon;
        }
    }

    private updatePresetName(name: string): void {
        if (!this.currentPresetId) return;
        const preset = this.presets[this.currentPresetId];
        if (!preset) return;

        preset._name = name.trim() || 'New Weapon Preset';
        this.renderPresetsList();
        this.saveToStorage();
    }
}
