import type {Reward} from '../types/reward';

import {REWARD_TYPES, type RewardType} from '../constants/reward-types';
import {REWARD_TIMINGS, type RewardTiming, SKILLS} from '../constants/rewards';
import {type TraderName, TRADERS} from '../constants/traders';
import {generateId} from '../utils/helpers';

export type RewardCallback = (reward: Reward, timing: RewardTiming) => void;

export class RewardBuilder {
    private dialog: HTMLDialogElement;
    private editingReward: null | Reward = null;
    private editingTiming: null | RewardTiming = null;
    private onSave: null | RewardCallback = null;

    constructor() {
        this.dialog = this.createDialog();
        document.body.appendChild(this.dialog);
        this.bindEvents();
    }

    public close(): void {
        this.dialog.close();
        this.onSave = null;
        this.editingReward = null;
        this.editingTiming = null;
    }

    public open(callback: RewardCallback, editReward?: Reward, editTiming?: RewardTiming): void {
        this.onSave = callback;
        this.editingReward = editReward || null;
        this.editingTiming = editTiming || null;

        // Reset form
        const form = this.dialog.querySelector('#rewardForm') as HTMLFormElement;
        form.reset();

        // Update dialog title and button text based on mode
        const title = this.dialog.querySelector('h2')!;
        const submitBtn = this.dialog.querySelector('button[type="submit"]')!;
        title.textContent = editReward ? 'Edit Reward' : 'Add Reward';
        submitBtn.textContent = editReward ? 'Save Reward' : 'Add Reward';

        // Set defaults or load existing
        const typeSelect = this.dialog.querySelector('#rewardType') as HTMLSelectElement;
        const timingSelect = this.dialog.querySelector('#rewardTiming') as HTMLSelectElement;

        if (editReward) {
            typeSelect.value = editReward.type;
            timingSelect.value = editTiming || 'Success';
            this.updateFields(editReward.type);
            // Populate fields with existing values after fields are created
            this.populateFieldsWithReward(editReward);
        } else {
            typeSelect.value = 'Experience';
            timingSelect.value = 'Success';
            this.updateFields('Experience');
        }

        this.dialog.showModal();
    }

    private bindEvents(): void {
        // Close button
        this.dialog.querySelector('#closeRewardDialog')?.addEventListener('click', () => this.close());
        this.dialog.querySelector('#cancelReward')?.addEventListener('click', () => this.close());

        // Close on backdrop click
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) this.close();
        });

        // Type change - update fields
        const typeSelect = this.dialog.querySelector('#rewardType') as HTMLSelectElement;
        typeSelect.addEventListener('change', () => this.updateFields(typeSelect.value as RewardType));

        // Form submit
        this.dialog.querySelector('#rewardForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Populate selects
        this.populateSelects();
    }

    private createDialog(): HTMLDialogElement {
        const dialog = document.createElement('dialog');
        dialog.id = 'rewardDialog';
        dialog.className = 'bg-tarkov-surface border border-tarkov-border rounded-lg p-0 w-[calc(100%-1rem)] sm:w-full max-w-2xl mx-2 sm:mx-auto backdrop:bg-black/50';

        dialog.innerHTML = `
            <div class="p-4 sm:p-6">
                <div class="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 class="text-lg sm:text-xl font-semibold text-tarkov-text">Add Reward</h2>
                    <button type="button" id="closeRewardDialog" class="text-tarkov-text-muted hover:text-tarkov-text text-2xl">&times;</button>
                </div>

                <form id="rewardForm">
                    <!-- Common fields -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                        <div class="form-group">
                            <label for="rewardType">Reward Type</label>
                            <select id="rewardType" name="rewardType" class="w-full"></select>
                        </div>
                        <div class="form-group">
                            <label for="rewardTiming">Timing</label>
                            <select id="rewardTiming" name="rewardTiming" class="w-full"></select>
                        </div>
                    </div>

                    <!-- Dynamic fields container -->
                    <div id="rewardFields" class="space-y-4 mb-6"></div>

                    <!-- Actions -->
                    <div class="flex justify-end gap-2">
                        <button type="button" id="cancelReward" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Reward</button>
                    </div>
                </form>
            </div>
        `;

        return dialog;
    }

    private handleSubmit(): void {
        const form = this.dialog.querySelector('#rewardForm') as HTMLFormElement;
        const formData = new FormData(form);

        const type = formData.get('rewardType') as RewardType;
        const timing = formData.get('rewardTiming') as RewardTiming;
        const id = this.editingReward?.id || generateId();

        const baseReward = {
            availableInGameEditions: [],
            id,
            index                  : 0,
            unknown                : formData.get('unknown') !== 'on',
        };

        let reward: Reward;

        switch (type) {
            case 'Achievement':
                reward = {
                    ...baseReward,
                    target: formData.get('achievementId') as string,
                    type  : 'Achievement',
                };
                break;

            case 'AssortmentUnlock': {
                const asuItemId = generateId();
                reward = {
                    ...baseReward,
                    items: [{
                        _id : asuItemId,
                        _tpl: formData.get('itemTpl') as string,
                    }],
                    loyaltyLevel: parseInt(formData.get('loyaltyLevel') as string) || 1,
                    target      : asuItemId,
                    traderId    : TRADERS[formData.get('trader') as TraderName],
                    type        : 'AssortmentUnlock',
                };
                break;
            }

            case 'Experience':
                reward = {
                    ...baseReward,
                    type : 'Experience',
                    value: parseInt(formData.get('value') as string) || 0,
                };
                break;

            case 'Item': {
                const itemId = generateId();
                reward = {
                    ...baseReward,
                    findInRaid: formData.get('findInRaid') === 'on',
                    items     : [{
                        _id : itemId,
                        _tpl: formData.get('itemTpl') as string,
                        upd : {
                            StackObjectsCount: parseInt(formData.get('value') as string) || 1,
                        },
                    }],
                    target: itemId,
                    type  : 'Item',
                    value : parseInt(formData.get('value') as string) || 1,
                };
                break;
            }

            case 'Skill':
                reward = {
                    ...baseReward,
                    target: formData.get('skill') as string,
                    type  : 'Skill',
                    value : parseInt(formData.get('value') as string) || 0,
                };
                break;

            case 'StashRows':
                reward = {
                    ...baseReward,
                    type : 'StashRows',
                    value: parseInt(formData.get('value') as string) || 1,
                };
                break;

            case 'TraderStanding':
                reward = {
                    ...baseReward,
                    target: TRADERS[formData.get('trader') as TraderName],
                    type  : 'TraderStanding',
                    value : parseFloat(formData.get('value') as string) || 0,
                };
                break;

            case 'TraderUnlock':
                reward = {
                    ...baseReward,
                    target: TRADERS[formData.get('trader') as TraderName],
                    type  : 'TraderUnlock',
                };
                break;

            default:
                return;
        }

        if (this.onSave) {
            this.onSave(reward, timing);
        }

        this.close();
    }

    private populateFieldsWithReward(reward: Reward): void {
        switch (reward.type) {
            case 'Achievement':
                this.setFieldValue('achievementId', reward.target || '');
                this.setCheckboxValue('unknown', reward.unknown === true);
                break;

            case 'AssortmentUnlock': {
                // Find trader name from ID
                const traderName = Object.entries(TRADERS).find(([_, id]) => id === reward.traderId)?.[0] || 'Prapor';
                this.setFieldValue('trader', traderName);
                this.setFieldValue('loyaltyLevel', String(reward.loyaltyLevel || 1));
                this.setFieldValue('itemTpl', reward.items?.[0]?._tpl || '');
                this.setCheckboxValue('unknown', reward.unknown === true);
                break;
            }

            case 'Experience':
            case 'StashRows':
                this.setFieldValue('value', String(reward.value || 0));
                this.setCheckboxValue('unknown', reward.unknown === true);
                break;

            case 'Item':
                this.setFieldValue('itemTpl', reward.items?.[0]?._tpl || '');
                this.setFieldValue('value', String(reward.value || 1));
                this.setCheckboxValue('findInRaid', reward.findInRaid || false);
                this.setCheckboxValue('unknown', reward.unknown === true);
                break;

            case 'Skill':
                this.setFieldValue('skill', reward.target || '');
                this.setFieldValue('value', String(reward.value || 0));
                this.setCheckboxValue('unknown', reward.unknown === true);
                break;

            case 'TraderStanding': {
                const tsTraderName = Object.entries(TRADERS).find(([_, id]) => id === reward.target)?.[0] || 'Prapor';
                this.setFieldValue('trader', tsTraderName);
                this.setFieldValue('value', String(reward.value || 0));
                this.setCheckboxValue('unknown', reward.unknown === true);
                break;
            }

            case 'TraderUnlock': {
                const tuTraderName = Object.entries(TRADERS).find(([_, id]) => id === reward.target)?.[0] || 'Prapor';
                this.setFieldValue('trader', tuTraderName);
                this.setCheckboxValue('unknown', reward.unknown === true);
                break;
            }
        }
    }

    private populateSelects(): void {
        const typeSelect = this.dialog.querySelector('#rewardType') as HTMLSelectElement;
        REWARD_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });

        const timingSelect = this.dialog.querySelector('#rewardTiming') as HTMLSelectElement;
        REWARD_TIMINGS.forEach(timing => {
            const option = document.createElement('option');
            option.value = timing;
            option.textContent = timing;
            timingSelect.appendChild(option);
        });
    }

    private setCheckboxValue(name: string, checked: boolean): void {
        const field = this.dialog.querySelector(`[name="${name}"]`) as HTMLInputElement;
        if (field) field.checked = checked;
    }

    private setFieldValue(name: string, value: string): void {
        const field = this.dialog.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;
        if (field) field.value = value;
    }

    private updateFields(type: RewardType): void {
        const container = this.dialog.querySelector('#rewardFields')!;

        switch (type) {
            case 'Achievement':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="achId">Achievement ID</label>
                        <input type="text" id="achId" name="achievementId" class="w-full" placeholder="Achievement identifier" />
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            case 'AssortmentUnlock':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="asuTrader">Trader</label>
                            <select id="asuTrader" name="trader" class="w-full">
                                ${Object.keys(TRADERS).map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="asuLoyalty">Loyalty Level</label>
                            <input type="number" id="asuLoyalty" name="loyaltyLevel" class="w-full" min="1" max="4" value="1" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="asuItemTpl">Item Template ID</label>
                        <input type="text" id="asuItemTpl" name="itemTpl" class="w-full" placeholder="Item to unlock for purchase" />
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            case 'Experience':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="expValue">Experience Amount</label>
                        <input type="number" id="expValue" name="value" class="w-full" min="0" value="1000" />
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            case 'Item':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="itemTpl">Item Template ID</label>
                            <input type="text" id="itemTpl" name="itemTpl" class="w-full" placeholder="e.g., 5449016a4bdc2d6f028b456f" />
                        </div>
                        <div class="form-group">
                            <label for="itemCount">Count</label>
                            <input type="number" id="itemCount" name="value" class="w-full" min="1" value="1" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="itemFir" name="findInRaid" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Found in Raid</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            case 'Skill':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="skillTarget">Skill</label>
                            <select id="skillTarget" name="skill" class="w-full">
                                ${SKILLS.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="skillValue">Points</label>
                            <input type="number" id="skillValue" name="value" class="w-full" min="0" value="100" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            case 'StashRows':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="stashRows">Number of Rows</label>
                        <input type="number" id="stashRows" name="value" class="w-full" min="1" value="1" />
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            case 'TraderStanding':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="tsTrader">Trader</label>
                            <select id="tsTrader" name="trader" class="w-full">
                                ${Object.keys(TRADERS).map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tsValue">Standing Change</label>
                            <input type="number" id="tsValue" name="value" class="w-full" step="0.01" value="0.02" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            case 'TraderUnlock':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="tuTrader">Trader to Unlock</label>
                        <select id="tuTrader" name="trader" class="w-full">
                            ${Object.keys(TRADERS).map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="unknown" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Hide Reward (?)</span>
                        </label>
                    </div>
                `;
                break;

            default:
                container.innerHTML = '<p class="text-tarkov-text-muted">Select a reward type</p>';
        }
    }
}
