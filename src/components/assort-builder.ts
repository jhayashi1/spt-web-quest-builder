import type {CurrencyType, TraderAssort} from '../types/assort';

import {type TraderName, TRADERS} from '../constants/traders';
import {CURRENCIES} from '../types/assort';
import {downloadJson, generateId, readJsonFile} from '../utils/helpers';

export type AssortCallback = (assort: TraderAssort) => void;

/** Assort item in the builder list */
interface AssortListItem {
    count: number;
    currency: CurrencyType;
    id: string;
    itemName: string;
    itemTpl: string;
    loyaltyLevel: number;
    price: number;
    questLock?: string;
    unlimited: boolean;
}

export class AssortBuilder {
    private assortItems: AssortListItem[] = [];
    private container: HTMLElement;
    private currentTrader: TraderName = 'Prapor';
    private editingItemId: null | string = null;

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) || this.createContainer();
        this.render();
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
            assort.items.push({
                _id     : item.id,
                _tpl    : item.itemTpl,
                parentId: 'hideout',
                slotId  : 'hideout',
                upd     : {
                    StackObjectsCount: item.count,
                    UnlimitedCount   : item.unlimited,
                },
            });

            assort.barter_scheme[item.id] = [[{
                _tpl : CURRENCIES[item.currency],
                count: item.price,
            }]];

            assort.loyal_level_items[item.id] = item.loyaltyLevel;

            if (item.questLock && assort.questassort) {
                assort.questassort.success[item.questLock] = item.id;
            }
        }

        return assort;
    }

    public render(): void {
        this.container.innerHTML = `
            <div class="panel">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <h2 class="text-lg sm:text-xl font-semibold text-tarkov-text">Trader Assort Builder</h2>
                    <div class="flex gap-2">
                        <button type="button" id="importAssortBtn" class="btn btn-secondary text-sm">Import</button>
                        <input type="file" id="importAssortFile" accept=".json" class="hidden" />
                        <button type="button" id="exportAssortBtn" class="btn btn-primary text-sm">Export</button>
                    </div>
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
                                <input type="text" id="itemName" name="itemName" class="w-full" placeholder="Friendly name" />
                            </div>
                            <div class="form-group sm:col-span-2 md:col-span-1">
                                <label for="itemCount">Stack Count</label>
                                <input type="number" id="itemCount" name="count" class="w-full" min="1" value="1" />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div class="form-group">
                                <label for="itemPrice">Price</label>
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
                                <label for="itemQuestLock">Quest Lock (optional)</label>
                                <input type="text" id="itemQuestLock" name="questLock" class="w-full" placeholder="Quest ID" />
                            </div>
                        </div>

                        <div class="flex items-center gap-4 mb-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="itemUnlimited" name="unlimited" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                                <span class="text-sm">Unlimited Stock</span>
                            </label>
                        </div>

                        <div class="flex gap-2">
                            <button type="submit" class="btn btn-primary text-sm" id="addItemBtn">Add Item</button>
                            <button type="button" class="btn btn-secondary text-sm hidden" id="cancelEditBtn">Cancel</button>
                        </div>
                    </form>
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

        // Import
        document.getElementById('importAssortBtn')?.addEventListener('click', () => {
            document.getElementById('importAssortFile')?.click();
        });

        document.getElementById('importAssortFile')?.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            if (input.files?.[0]) {
                this.importAssort(input.files[0]);
                input.value = '';
            }
        });

        // Export
        document.getElementById('exportAssortBtn')?.addEventListener('click', () => {
            this.exportAssort();
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
    }

    private cancelEdit(): void {
        this.editingItemId = null;
        (document.getElementById('assortItemForm') as HTMLFormElement).reset();
        (document.getElementById('itemFormTitle') as HTMLElement).textContent = 'Add New Item';
        (document.getElementById('addItemBtn') as HTMLButtonElement).textContent = 'Add Item';
        document.getElementById('cancelEditBtn')?.classList.add('hidden');
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
        (document.getElementById('itemQuestLock') as HTMLInputElement).value = item.questLock || '';
        (document.getElementById('itemUnlimited') as HTMLInputElement).checked = item.unlimited;

        // Update UI
        (document.getElementById('itemFormTitle') as HTMLElement).textContent = 'Edit Item';
        (document.getElementById('addItemBtn') as HTMLButtonElement).textContent = 'Save Changes';
        document.getElementById('cancelEditBtn')?.classList.remove('hidden');

        // Scroll to form
        this.container.scrollIntoView({behavior: 'smooth'});
    }

    private exportAssort(): void {
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
            // Add item
            assort.items.push({
                _id     : item.id,
                _tpl    : item.itemTpl,
                parentId: 'hideout',
                slotId  : 'hideout',
                upd     : {
                    StackObjectsCount: item.count,
                    UnlimitedCount   : item.unlimited,
                },
            });

            // Add barter scheme (price)
            assort.barter_scheme[item.id] = [[{
                _tpl : CURRENCIES[item.currency],
                count: item.price,
            }]];

            // Add loyalty level
            assort.loyal_level_items[item.id] = item.loyaltyLevel;

            // Add quest lock if present
            if (item.questLock && assort.questassort) {
                assort.questassort.success[item.questLock] = item.id;
            }
        }

        const filename = `${this.currentTrader.toLowerCase()}_assort.json`;
        downloadJson(assort, filename);
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

        const item: AssortListItem = {
            count       : parseInt(formData.get('count') as string) || 1,
            currency    : formData.get('currency') as CurrencyType,
            id          : this.editingItemId || generateId(),
            itemName    : formData.get('itemName') as string || '',
            itemTpl     : formData.get('itemTpl') as string,
            loyaltyLevel: parseInt(formData.get('loyaltyLevel') as string) || 1,
            price       : parseInt(formData.get('price') as string) || 1000,
            questLock   : formData.get('questLock') as string || undefined,
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

    private async importAssort(file: File): Promise<void> {
        try {
            const data = await readJsonFile<TraderAssort>(file);

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

                    // Check for quest lock
                    let questLock: string | undefined;
                    for (const [questId, itemId] of Object.entries(data.questassort?.success || {})) {
                        if (itemId === item._id) {
                            questLock = questId;
                            break;
                        }
                    }

                    return {
                        count    : item.upd?.StackObjectsCount || 1,
                        currency,
                        id       : item._id,
                        itemName : '',
                        itemTpl  : item._tpl,
                        loyaltyLevel,
                        price    : barterScheme?.count || 1000,
                        questLock,
                        unlimited: item.upd?.UnlimitedCount || false,
                    };
                });

            this.render();
            alert(`Imported ${this.assortItems.length} items`);
        } catch (err) {
            alert(`Failed to import: ${err}`);
        }
    }

    private renderItemsList(): string {
        return this.assortItems.map(item => `
            <div class="flex items-center justify-between p-3 bg-tarkov-surface rounded border border-tarkov-border hover:border-tarkov-accent transition-colors">
                <div class="flex-1">
                    <div class="font-medium text-tarkov-text">
                        ${item.itemName || item.itemTpl}
                        ${item.unlimited ? '<span class="text-xs text-tarkov-accent ml-2">(Unlimited)</span>' : `<span class="text-xs text-tarkov-text-muted ml-2">(x${item.count})</span>`}
                    </div>
                    <div class="text-sm text-tarkov-text-muted">
                        <span class="text-tarkov-accent">${this.formatPrice(item.price, item.currency)}</span>
                        <span class="mx-2">•</span>
                        <span>LL ${item.loyaltyLevel}</span>
                        ${item.questLock ? '<span class="mx-2">•</span><span class="text-yellow-500">Quest Locked</span>' : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button type="button" class="text-tarkov-accent hover:text-tarkov-accent-hover edit-assort-item" data-id="${item.id}">Edit</button>
                    <button type="button" class="text-tarkov-danger hover:text-red-400 delete-assort-item" data-id="${item.id}">&times;</button>
                </div>
            </div>
        `).join('');
    }
}
