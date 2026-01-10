import type {CurrencyType, QuestConditionType, TraderAssort} from '../types/assort';

import {type TraderName, TRADERS} from '../constants/traders';
import {CURRENCIES} from '../types/assort';
import {downloadJson, generateId, readJsonFile} from '../utils/helpers';

export type AssortCallback = (assort: TraderAssort) => void;

/** Assort item in the builder list */
interface AssortListItem {
    buyRestriction?: number;
    count: number;
    currency: CurrencyType;
    id: string;
    itemName: string;
    itemTpl: string;
    loyaltyLevel: number;
    price: number;
    questCondition?: QuestConditionType;
    questLock?: string;
    unlimited: boolean;
}

/** Weapon part attached to an assort item */
interface AssortWeaponPart {
    id: string;
    itemTpl: string;
    modSlot: string;
    parentId: string;
}

export class AssortBuilder {
    public get hasCurrentItem(): boolean {
        return !!this.editingItemId;
    }
    public get hasItems(): boolean {
        return this.assortItems.length > 0;
    }
    private assortItems: AssortListItem[] = [];
    private container: HTMLElement;
    private currentTrader: TraderName = 'Prapor';

    private editingItemId: null | string = null;

    private weaponParts: AssortWeaponPart[] = [];

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) || this.createContainer();
        this.render();
    }

    public exportAssort(): void {
        const assort: TraderAssort = {
            barter_scheme    : {},
            items            : [],
            loyal_level_items: {},
            questassort      : {
                fail   : {},
                started: {},
                success: {},
            },
        };

        for (const item of this.assortItems) {
            // Build upd object
            const upd: TraderAssort['items'][0]['upd'] = {
                StackObjectsCount: item.count,
                UnlimitedCount   : item.unlimited,
            };

            // Add buy restriction if present
            if (item.buyRestriction && item.buyRestriction > 0) {
                upd.BuyRestrictionCurrent = 0;
                upd.BuyRestrictionMax = item.buyRestriction;
            }

            // Add item
            assort.items.push({
                _id     : item.id,
                _tpl    : item.itemTpl,
                parentId: 'hideout',
                slotId  : 'hideout',
                upd,
            });

            // Add barter scheme (price)
            assort.barter_scheme[item.id] = [[{
                _tpl : CURRENCIES[item.currency],
                count: item.price,
            }]];

            // Add loyalty level
            assort.loyal_level_items[item.id] = item.loyaltyLevel;

            // Add quest lock if present with condition type
            if (item.questLock && assort.questassort) {
                const condition = item.questCondition || 'success';
                assort.questassort[condition][item.questLock] = item.id;
            }
        }

        // Add weapon parts
        for (const part of this.weaponParts) {
            assort.items.push({
                _id     : part.id,
                _tpl    : part.itemTpl,
                parentId: part.parentId,
                slotId  : part.modSlot,
            });
        }

        const filename = `${this.currentTrader.toLowerCase()}_assort.json`;
        downloadJson(assort, filename);
    }

    public exportCurrentItem(): void {
        if (!this.editingItemId) {
            alert('No item selected. Select an item to export.');
            return;
        }

        const item = this.assortItems.find(i => i.id === this.editingItemId);
        if (!item) {
            alert('Selected item not found.');
            return;
        }

        // Build a single-item assort
        const assort: TraderAssort = {
            barter_scheme    : {},
            items            : [],
            loyal_level_items: {},
            questassort      : {
                fail   : {},
                started: {},
                success: {},
            },
        };

        // Build upd object
        const upd: TraderAssort['items'][0]['upd'] = {
            StackObjectsCount: item.count,
            UnlimitedCount   : item.unlimited,
        };

        if (item.buyRestriction && item.buyRestriction > 0) {
            upd.BuyRestrictionCurrent = 0;
            upd.BuyRestrictionMax = item.buyRestriction;
        }

        assort.items.push({
            _id     : item.id,
            _tpl    : item.itemTpl,
            parentId: 'hideout',
            slotId  : 'hideout',
            upd,
        });

        assort.barter_scheme[item.id] = [[{
            _tpl : CURRENCIES[item.currency],
            count: item.price,
        }]];

        assort.loyal_level_items[item.id] = item.loyaltyLevel;

        if (item.questLock && assort.questassort) {
            const condition = item.questCondition || 'success';
            assort.questassort[condition][item.questLock] = item.id;
        }

        // Add weapon parts for this item
        for (const part of this.weaponParts.filter(p => p.parentId === item.id)) {
            assort.items.push({
                _id     : part.id,
                _tpl    : part.itemTpl,
                parentId: part.parentId,
                slotId  : part.modSlot,
            });
        }

        const itemName = item.itemName || item.itemTpl;
        const filename = `${itemName.replace(/[^a-zA-Z0-9]/g, '_')}_assort.json`;
        downloadJson(assort, filename);
    }

    public getAssort(): TraderAssort {
        const assort: TraderAssort = {
            barter_scheme    : {},
            items            : [],
            loyal_level_items: {},
            questassort      : {
                fail   : {},
                started: {},
                success: {},
            },
        };

        for (const item of this.assortItems) {
            // Build upd object
            const upd: TraderAssort['items'][0]['upd'] = {
                StackObjectsCount: item.count,
                UnlimitedCount   : item.unlimited,
            };

            // Add buy restriction if present
            if (item.buyRestriction && item.buyRestriction > 0) {
                upd.BuyRestrictionCurrent = 0;
                upd.BuyRestrictionMax = item.buyRestriction;
            }

            assort.items.push({
                _id     : item.id,
                _tpl    : item.itemTpl,
                parentId: 'hideout',
                slotId  : 'hideout',
                upd,
            });

            assort.barter_scheme[item.id] = [[{
                _tpl : CURRENCIES[item.currency],
                count: item.price,
            }]];

            assort.loyal_level_items[item.id] = item.loyaltyLevel;

            if (item.questLock && assort.questassort) {
                const condition = item.questCondition || 'success';
                assort.questassort[condition][item.questLock] = item.id;
            }
        }

        // Add weapon parts
        for (const part of this.weaponParts) {
            assort.items.push({
                _id     : part.id,
                _tpl    : part.itemTpl,
                parentId: part.parentId,
                slotId  : part.modSlot,
            });
        }

        return assort;
    }

    public async importAssort(file: File): Promise<void> {
        try {
            const data = await readJsonFile<TraderAssort>(file);

            // Clear existing weapon parts
            this.weaponParts = [];

            // Convert imported data to our format
            this.assortItems = data.items
                .filter(item => !item.parentId || item.parentId === 'hideout') // Only root items
                .map(item => {
                    const barterScheme = data.barter_scheme[item._id]?.[0]?.[0];
                    const loyaltyLevel = data.loyal_level_items[item._id] || 1;

                    // Determine currency
                    let currency: CurrencyType = 'Roubles';
                    if (barterScheme?._tpl === CURRENCIES.Dollars) currency = 'Dollars';
                    else if (barterScheme?._tpl === CURRENCIES.Euros) currency = 'Euros';

                    // Check for quest lock and determine condition type
                    let questLock: string | undefined;
                    let questCondition: QuestConditionType | undefined;

                    // Check success conditions
                    for (const [questId, itemId] of Object.entries(data.questassort?.success || {})) {
                        if (itemId === item._id) {
                            questLock = questId;
                            questCondition = 'success';
                            break;
                        }
                    }
                    // Check started conditions
                    if (!questLock) {
                        for (const [questId, itemId] of Object.entries(data.questassort?.started || {})) {
                            if (itemId === item._id) {
                                questLock = questId;
                                questCondition = 'started';
                                break;
                            }
                        }
                    }
                    // Check fail conditions
                    if (!questLock) {
                        for (const [questId, itemId] of Object.entries(data.questassort?.fail || {})) {
                            if (itemId === item._id) {
                                questLock = questId;
                                questCondition = 'fail';
                                break;
                            }
                        }
                    }

                    return {
                        buyRestriction: item.upd?.BuyRestrictionMax,
                        count         : item.upd?.StackObjectsCount || 1,
                        currency,
                        id            : item._id,
                        itemName      : '',
                        itemTpl       : item._tpl,
                        loyaltyLevel,
                        price         : barterScheme?.count || 1000,
                        questCondition,
                        questLock,
                        unlimited     : item.upd?.UnlimitedCount || false,
                    };
                });

            // Import weapon parts (items with non-hideout parent)
            const _rootItemIds = new Set(this.assortItems.map(item => item.id));
            this.weaponParts = data.items
                .filter(item => item.parentId && item.parentId !== 'hideout')
                .map(item => ({
                    id      : item._id,
                    itemTpl : item._tpl,
                    modSlot : item.slotId || 'mod_pistol_grip',
                    parentId: item.parentId || '',
                }));

            this.render();
            alert(`Imported ${this.assortItems.length} items and ${this.weaponParts.length} weapon parts`);
        } catch (err) {
            alert(`Failed to import: ${err}`);
        }
    }

    public render(): void {
        this.container.innerHTML = `
            <div class="panel">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <h2 class="text-lg sm:text-xl font-semibold text-tarkov-text">Trader Assort Builder</h2>
                </div>

                <!-- Trader Selection -->
                <div class="form-group mb-4 sm:mb-6">
                    <label for="assortTrader">Trader</label>
                    <select id="assortTrader" class="w-full">
                        ${Object.keys(TRADERS).map(t => `<option value="${t}" ${t === this.currentTrader ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>

                <!-- Add Item Form -->
                <div class="bg-tarkov-bg border border-tarkov-border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <h3 class="font-semibold mb-3 sm:mb-4 text-sm sm:text-base" id="itemFormTitle">Add New Item</h3>
                    <form id="assortItemForm">
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                            <div class="form-group">
                                <label for="itemTpl">Item Template ID</label>
                                <input type="text" id="itemTpl" name="itemTpl" class="w-full" placeholder="e.g., 5449016a4bdc2d6f028b456f" required />
                            </div>
                            <div class="form-group">
                                <label for="itemName">Display Name (optional)</label>
                                <input type="text" id="itemName" name="itemName" class="w-full" placeholder="Friendly name for organization" />
                                <p class="text-xs text-tarkov-text-muted mt-1">Not exported to JSON</p>
                            </div>
                            <div class="form-group sm:col-span-2 md:col-span-1">
                                <label for="itemCount">Quantity</label>
                                <input type="number" id="itemCount" name="count" class="w-full" min="1" value="1" />
                                <p class="text-xs text-tarkov-text-muted mt-1">Server-wide stock if not unlimited</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div class="form-group">
                                <label for="itemPrice">Cost</label>
                                <input type="number" id="itemPrice" name="price" class="w-full" min="1" value="1000" required />
                            </div>
                            <div class="form-group">
                                <label for="itemCurrency">Currency</label>
                                <select id="itemCurrency" name="currency" class="w-full">
                                    <option value="Roubles" selected>Roubles (₽)</option>
                                    <option value="Dollars">Dollars ($)</option>
                                    <option value="Euros">Euros (€)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="itemLoyalty">Loyalty Level</label>
                                <select id="itemLoyalty" name="loyaltyLevel" class="w-full">
                                    <option value="1">Level 1</option>
                                    <option value="2">Level 2</option>
                                    <option value="3">Level 3</option>
                                    <option value="4">Level 4</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="flex items-center gap-2 cursor-pointer mt-6">
                                    <input type="checkbox" id="itemUnlimited" name="unlimited" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                                    <span class="text-sm">Unlimited Quantity</span>
                                </label>
                                <p class="text-xs text-tarkov-text-muted mt-1">Typically true for regular traders</p>
                            </div>
                        </div>

                        <!-- Quest Lock Section -->
                        <div class="bg-tarkov-surface border border-tarkov-border rounded-lg p-3 mb-4">
                            <div class="flex items-center gap-2 mb-3">
                                <input type="checkbox" id="questLockEnabled" class="rounded border-tarkov-border bg-tarkov-bg text-tarkov-accent" />
                                <label for="questLockEnabled" class="font-medium cursor-pointer">Quest Locked?</label>
                            </div>
                            <div id="questLockFields" class="hidden">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div class="form-group">
                                        <label for="itemQuestLock">Quest ID</label>
                                        <input type="text" id="itemQuestLock" name="questLock" class="w-full" placeholder="Quest ID that unlocks item" />
                                    </div>
                                    <div class="form-group">
                                        <label for="questCondition">Condition</label>
                                        <select id="questCondition" name="questCondition" class="w-full">
                                            <option value="success" selected>Success (Quest Completed)</option>
                                            <option value="started">Started (Quest In Progress)</option>
                                            <option value="fail">Fail (Quest Failed)</option>
                                        </select>
                                        <p class="text-xs text-tarkov-text-muted mt-1">When the item becomes available</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Buy Restriction Section -->
                        <div class="bg-tarkov-surface border border-tarkov-border rounded-lg p-3 mb-4">
                            <div class="flex items-center gap-2 mb-3">
                                <input type="checkbox" id="buyRestrictionEnabled" class="rounded border-tarkov-border bg-tarkov-bg text-tarkov-accent" />
                                <label for="buyRestrictionEnabled" class="font-medium cursor-pointer">Buy Restriction?</label>
                                <span class="text-xs text-tarkov-text-muted">(Limit purchases per restock period)</span>
                            </div>
                            <div id="buyRestrictionFields" class="hidden">
                                <div class="form-group">
                                    <label for="buyRestrictionAmount">Buy Restriction Amount</label>
                                    <input type="number" id="buyRestrictionAmount" name="buyRestriction" class="w-full" min="1" value="1" placeholder="Max purchases per restock" />
                                    <p class="text-xs text-tarkov-text-muted mt-1">How many can be purchased per restock if unlimited</p>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-2">
                            <button type="submit" class="btn btn-primary text-sm" id="addItemBtn">Add Item</button>
                            <button type="button" class="btn btn-secondary text-sm hidden" id="cancelEditBtn">Cancel</button>
                        </div>
                    </form>
                </div>

                <!-- Weapon Part Form (for existing weapons in assort) -->
                <div class="bg-tarkov-bg border border-tarkov-border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <div class="flex items-center gap-2 mb-3">
                        <input type="checkbox" id="weaponPartEnabled" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                        <label for="weaponPartEnabled" class="font-semibold cursor-pointer">Add Weapon Part to Existing Assort Item?</label>
                    </div>
                    <div id="weaponPartFields" class="hidden">
                        <p class="text-xs text-tarkov-text-muted mb-3">Use this to attach weapon parts to weapons already in the assort (e.g., pre-modded weapons)</p>
                        <form id="weaponPartForm">
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div class="form-group">
                                    <label for="partAssortId">Assort ID (Parent)</label>
                                    <select id="partAssortId" name="partAssortId" class="w-full">
                                        <option value="">Select item from assort...</option>
                                        ${this.assortItems.map(item => `<option value="${item.id}">${item.itemName || item.itemTpl}</option>`).join('')}
                                    </select>
                                    <p class="text-xs text-tarkov-text-muted mt-1">Click weapon in assort list</p>
                                </div>
                                <div class="form-group">
                                    <label for="partItemId">Part Item ID</label>
                                    <input type="text" id="partItemId" name="partItemId" class="w-full" placeholder="Part template ID" required />
                                </div>
                                <div class="form-group">
                                    <label for="partModSlot">Mod Slot</label>
                                    <select id="partModSlot" name="partModSlot" class="w-full">
                                        <option value="mod_pistol_grip">mod_pistol_grip</option>
                                        <option value="mod_stock">mod_stock</option>
                                        <option value="mod_magazine">mod_magazine</option>
                                        <option value="mod_barrel">mod_barrel</option>
                                        <option value="mod_handguard">mod_handguard</option>
                                        <option value="mod_sight_rear">mod_sight_rear</option>
                                        <option value="mod_sight_front">mod_sight_front</option>
                                        <option value="mod_muzzle">mod_muzzle</option>
                                        <option value="mod_gas_block">mod_gas_block</option>
                                        <option value="mod_tactical">mod_tactical</option>
                                        <option value="mod_mount">mod_mount</option>
                                        <option value="mod_scope">mod_scope</option>
                                        <option value="mod_foregrip">mod_foregrip</option>
                                        <option value="mod_equipment">mod_equipment</option>
                                        <option value="mod_receiver">mod_receiver</option>
                                        <option value="mod_charge">mod_charge</option>
                                        <option value="mod_trigger">mod_trigger</option>
                                        <option value="mod_hammer">mod_hammer</option>
                                        <option value="mod_catch">mod_catch</option>
                                    </select>
                                </div>
                                <div class="form-group flex items-end">
                                    <button type="submit" class="btn btn-secondary text-sm w-full">Add Part</button>
                                </div>
                            </div>
                        </form>
                        
                        <!-- Weapon Parts List -->
                        ${this.weaponParts.length > 0 ? `
                        <div class="mt-4">
                            <h4 class="text-sm font-medium mb-2">Attached Parts (${this.weaponParts.length})</h4>
                            <div class="space-y-1 max-h-40 overflow-y-auto">
                                ${this.weaponParts.map(part => `
                                    <div class="card-item text-sm">
                                        <div>
                                            <span class="text-tarkov-accent">${part.modSlot}</span>
                                            <span class="mx-2">→</span>
                                            <span class="text-tarkov-text-muted">${part.itemTpl}</span>
                                        </div>
                                        <button type="button" class="delete-weapon-part icon-btn-delete" data-id="${part.id}">&times;</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Items List -->
                <div class="bg-tarkov-bg border border-tarkov-border rounded-lg p-3 sm:p-4">
                    <h3 class="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Assort Items (${this.assortItems.length})</h3>
                    <div id="assortItemsList" class="space-y-2 max-h-96 overflow-y-auto">
                        ${this.assortItems.length === 0 ? '<p class="text-tarkov-text-muted">No items added yet.</p>' : this.renderItemsList()}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    private bindEvents(): void {
        // Trader selection
        document.getElementById('assortTrader')?.addEventListener('change', (e) => {
            this.currentTrader = (e.target as HTMLSelectElement).value as TraderName;
        });

        // Form submit
        document.getElementById('assortItemForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Cancel edit
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
            this.cancelEdit();
        });

        // Quest lock toggle
        document.getElementById('questLockEnabled')?.addEventListener('change', (e) => {
            const fields = document.getElementById('questLockFields');
            if (fields) {
                fields.classList.toggle('hidden', !(e.target as HTMLInputElement).checked);
            }
        });

        // Buy restriction toggle
        document.getElementById('buyRestrictionEnabled')?.addEventListener('change', (e) => {
            const fields = document.getElementById('buyRestrictionFields');
            if (fields) {
                fields.classList.toggle('hidden', !(e.target as HTMLInputElement).checked);
            }
        });

        // Weapon part toggle
        document.getElementById('weaponPartEnabled')?.addEventListener('change', (e) => {
            const fields = document.getElementById('weaponPartFields');
            if (fields) {
                fields.classList.toggle('hidden', !(e.target as HTMLInputElement).checked);
            }
        });

        // Weapon part form submit
        document.getElementById('weaponPartForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleWeaponPartSubmit();
        });

        // Delete weapon part buttons
        this.container.querySelectorAll('.delete-weapon-part').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.target as HTMLElement).dataset.id;
                if (id) this.deleteWeaponPart(id);
            });
        });

        // Edit/Delete buttons
        this.container.querySelectorAll('.edit-assort-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.target as HTMLElement).dataset.id;
                if (id) this.editItem(id);
            });
        });

        this.container.querySelectorAll('.delete-assort-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.target as HTMLElement).dataset.id;
                if (id) this.deleteItem(id);
            });
        });

        // Click assort item to select as parent for weapon part
        this.container.querySelectorAll('.select-as-parent').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.target as HTMLElement).dataset.id;
                if (id) {
                    const select = document.getElementById('partAssortId') as HTMLSelectElement;
                    if (select) {
                        select.value = id;
                    }
                    // Enable weapon part section if not already
                    const checkbox = document.getElementById('weaponPartEnabled') as HTMLInputElement;
                    const fields = document.getElementById('weaponPartFields');
                    if (checkbox && fields) {
                        checkbox.checked = true;
                        fields.classList.remove('hidden');
                    }
                }
            });
        });
    }

    private cancelEdit(): void {
        this.editingItemId = null;
        (document.getElementById('assortItemForm') as HTMLFormElement).reset();
        (document.getElementById('itemFormTitle') as HTMLElement).textContent = 'Add New Item';
        (document.getElementById('addItemBtn') as HTMLButtonElement).textContent = 'Add Item';
        document.getElementById('cancelEditBtn')?.classList.add('hidden');

        // Reset quest lock section
        const questLockEnabled = document.getElementById('questLockEnabled') as HTMLInputElement;
        const questLockFields = document.getElementById('questLockFields');
        if (questLockEnabled) questLockEnabled.checked = false;
        if (questLockFields) questLockFields.classList.add('hidden');

        // Reset buy restriction section
        const buyRestrictionEnabled = document.getElementById('buyRestrictionEnabled') as HTMLInputElement;
        const buyRestrictionFields = document.getElementById('buyRestrictionFields');
        if (buyRestrictionEnabled) buyRestrictionEnabled.checked = false;
        if (buyRestrictionFields) buyRestrictionFields.classList.add('hidden');
    }

    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'assortBuilderContainer';
        document.body.appendChild(container);
        return container;
    }

    private deleteItem(id: string): void {
        if (confirm('Delete this item?')) {
            this.assortItems = this.assortItems.filter(i => i.id !== id);
            this.render();
        }
    }

    private deleteWeaponPart(id: string): void {
        if (confirm('Delete this weapon part?')) {
            this.weaponParts = this.weaponParts.filter(p => p.id !== id);
            this.render();
        }
    }

    private editItem(id: string): void {
        const item = this.assortItems.find(i => i.id === id);
        if (!item) return;

        this.editingItemId = id;

        // Populate form
        (document.getElementById('itemTpl') as HTMLInputElement).value = item.itemTpl;
        (document.getElementById('itemName') as HTMLInputElement).value = item.itemName;
        (document.getElementById('itemCount') as HTMLInputElement).value = String(item.count);
        (document.getElementById('itemPrice') as HTMLInputElement).value = String(item.price);
        (document.getElementById('itemCurrency') as HTMLSelectElement).value = item.currency;
        (document.getElementById('itemLoyalty') as HTMLSelectElement).value = String(item.loyaltyLevel);
        (document.getElementById('itemUnlimited') as HTMLInputElement).checked = item.unlimited;

        // Quest lock fields
        const hasQuestLock = !!item.questLock;
        const questLockEnabled = document.getElementById('questLockEnabled') as HTMLInputElement;
        const questLockFields = document.getElementById('questLockFields');
        if (questLockEnabled) questLockEnabled.checked = hasQuestLock;
        if (questLockFields) questLockFields.classList.toggle('hidden', !hasQuestLock);
        (document.getElementById('itemQuestLock') as HTMLInputElement).value = item.questLock || '';
        (document.getElementById('questCondition') as HTMLSelectElement).value = item.questCondition || 'success';

        // Buy restriction fields
        const hasBuyRestriction = !!item.buyRestriction && item.buyRestriction > 0;
        const buyRestrictionEnabled = document.getElementById('buyRestrictionEnabled') as HTMLInputElement;
        const buyRestrictionFields = document.getElementById('buyRestrictionFields');
        if (buyRestrictionEnabled) buyRestrictionEnabled.checked = hasBuyRestriction;
        if (buyRestrictionFields) buyRestrictionFields.classList.toggle('hidden', !hasBuyRestriction);
        (document.getElementById('buyRestrictionAmount') as HTMLInputElement).value = String(item.buyRestriction || 1);

        // Update UI
        (document.getElementById('itemFormTitle') as HTMLElement).textContent = 'Edit Item';
        (document.getElementById('addItemBtn') as HTMLButtonElement).textContent = 'Save Changes';
        document.getElementById('cancelEditBtn')?.classList.remove('hidden');

        // Scroll to form
        this.container.scrollIntoView({behavior: 'smooth'});
    }

    private formatPrice(price: number, currency: CurrencyType): string {
        switch (currency) {
            case 'Dollars':
                return `$${price.toLocaleString()}`;
            case 'Euros':
                return `€${price.toLocaleString()}`;
            default:
                return `₽${price.toLocaleString()}`;
        }
    }

    private handleFormSubmit(): void {
        const form = document.getElementById('assortItemForm') as HTMLFormElement;
        const formData = new FormData(form);

        // Check if quest lock is enabled
        const questLockEnabled = (document.getElementById('questLockEnabled') as HTMLInputElement)?.checked;
        const questLock = questLockEnabled ? formData.get('questLock') as string || undefined : undefined;
        const questCondition = questLockEnabled ? formData.get('questCondition') as QuestConditionType || 'success' : undefined;

        // Check if buy restriction is enabled
        const buyRestrictionEnabled = (document.getElementById('buyRestrictionEnabled') as HTMLInputElement)?.checked;
        const buyRestriction = buyRestrictionEnabled ? parseInt(formData.get('buyRestriction') as string) || undefined : undefined;

        const item: AssortListItem = {
            buyRestriction,
            count       : parseInt(formData.get('count') as string) || 1,
            currency    : formData.get('currency') as CurrencyType,
            id          : this.editingItemId || generateId(),
            itemName    : formData.get('itemName') as string || '',
            itemTpl     : formData.get('itemTpl') as string,
            loyaltyLevel: parseInt(formData.get('loyaltyLevel') as string) || 1,
            price       : parseInt(formData.get('price') as string) || 1000,
            questCondition,
            questLock,
            unlimited   : formData.get('unlimited') === 'on',
        };

        if (this.editingItemId) {
            // Update existing
            const index = this.assortItems.findIndex(i => i.id === this.editingItemId);
            if (index !== -1) {
                this.assortItems[index] = item;
            }
            this.editingItemId = null;
        } else {
            // Add new
            this.assortItems.push(item);
        }

        this.render();
    }

    private handleWeaponPartSubmit(): void {
        const form = document.getElementById('weaponPartForm') as HTMLFormElement;
        const formData = new FormData(form);

        const parentId = formData.get('partAssortId') as string;
        const itemTpl = formData.get('partItemId') as string;
        const modSlot = formData.get('partModSlot') as string;

        if (!parentId || !itemTpl) {
            alert('Please select a parent item and enter a part item ID');
            return;
        }

        const part: AssortWeaponPart = {
            id: generateId(),
            itemTpl,
            modSlot,
            parentId,
        };

        this.weaponParts.push(part);
        this.render();
    }

    private renderItemsList(): string {
        return this.assortItems.map(item => {
            // Count attached parts for this item
            const attachedParts = this.weaponParts.filter(p => p.parentId === item.id).length;

            return `
            <div class="card-item">
                <div class="flex-1">
                    <div class="font-medium text-tarkov-text">
                        ${item.itemName || item.itemTpl}
                        ${item.unlimited ? '<span class="badge-accent">(Unlimited)</span>' : `<span class="badge-muted">(x${item.count})</span>`}
                        ${item.buyRestriction ? `<span class="badge-orange">(Max ${item.buyRestriction}/restock)</span>` : ''}
                        ${attachedParts > 0 ? `<span class="badge-info">(${attachedParts} parts)</span>` : ''}
                    </div>
                    <div class="text-sm text-tarkov-text-muted">
                        <span class="text-tarkov-accent">${this.formatPrice(item.price, item.currency)}</span>
                        <span class="mx-2">•</span>
                        <span>LL ${item.loyaltyLevel}</span>
                        ${item.questLock ? `<span class="mx-2">•</span><span class="text-yellow-500">Quest Locked (${item.questCondition || 'success'})</span>` : ''}
                    </div>
                    <div class="text-muted">ID: ${item.id}</div>
                </div>
                <div class="actions">
                    <button type="button" class="select-as-parent action-link text-blue-400 hover:text-blue-300 text-xs" data-id="${item.id}" title="Select as parent for weapon part">📎</button>
                    <button type="button" class="action-link edit-assort-item" data-id="${item.id}">Edit</button>
                    <button type="button" class="icon-btn-delete delete-assort-item" data-id="${item.id}">&times;</button>
                </div>
            </div>
        `;
        }).join('');
    }
}
