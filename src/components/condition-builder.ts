import type {QuestCondition} from '../types/condition';

import {BODY_PARTS, COMPARE_METHODS, CONDITION_TYPES, type ConditionType, COUNTER_CONDITION_TYPES, ELIMINATION_TARGETS, EXIT_STATUSES, QUEST_STATUSES} from '../constants/conditions';
import {LOCATIONS} from '../constants/locations';
import {SKILLS} from '../constants/rewards';
import {TRADERS} from '../constants/traders';
import {WEAPON_CATEGORIES} from '../constants/weapons';
import {generateId} from '../utils/helpers';

/** Where the condition applies */
export const CONDITION_CATEGORIES = ['AvailableForStart', 'AvailableForFinish', 'Fail'] as const;
export type ConditionCallback = (condition: QuestCondition, category: ConditionCategory) => void;

export type ConditionCategory = typeof CONDITION_CATEGORIES[number];

export class ConditionBuilder {
    private dialog: HTMLDialogElement;
    private editingCategory: ConditionCategory | null = null;
    private editingCondition: null | QuestCondition = null;
    private onSave: ConditionCallback | null = null;

    constructor() {
        this.dialog = this.createDialog();
        document.body.appendChild(this.dialog);
        this.bindEvents();
    }

    public close(): void {
        this.dialog.close();
        this.onSave = null;
        this.editingCondition = null;
        this.editingCategory = null;
    }

    public open(callback: ConditionCallback, editCondition?: QuestCondition, editCategory?: ConditionCategory): void {
        this.onSave = callback;
        this.editingCondition = editCondition || null;
        this.editingCategory = editCategory || null;

        const form = this.dialog.querySelector('#conditionForm') as HTMLFormElement;
        form.reset();

        // Update dialog title and button text based on mode
        const title = this.dialog.querySelector('h2')!;
        const submitBtn = this.dialog.querySelector('button[type="submit"]')!;
        title.textContent = editCondition ? 'Edit Condition' : 'Add Condition';
        submitBtn.textContent = editCondition ? 'Save Condition' : 'Add Condition';

        const typeSelect = this.dialog.querySelector('#conditionType') as HTMLSelectElement;
        const categorySelect = this.dialog.querySelector('#conditionCategory') as HTMLSelectElement;

        if (editCondition) {
            typeSelect.value = editCondition.conditionType;
            categorySelect.value = editCategory || 'AvailableForStart';
            this.updateFields(editCondition.conditionType as ConditionType);
            // Populate fields with existing values after fields are created
            this.populateFieldsWithCondition(editCondition);
        } else {
            typeSelect.value = 'Level';
            this.updateFields('Level');
        }

        this.dialog.showModal();
    }

    private bindEvents(): void {
        this.dialog.querySelector('#closeConditionDialog')?.addEventListener('click', () => this.close());
        this.dialog.querySelector('#cancelCondition')?.addEventListener('click', () => this.close());

        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) this.close();
        });

        const typeSelect = this.dialog.querySelector('#conditionType') as HTMLSelectElement;
        typeSelect.addEventListener('change', () => this.updateFields(typeSelect.value as ConditionType));

        this.dialog.querySelector('#conditionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        this.populateSelects();
    }

    private createDialog(): HTMLDialogElement {
        const dialog = document.createElement('dialog');
        dialog.id = 'conditionDialog';
        dialog.className = 'bg-tarkov-surface border border-tarkov-border rounded-lg p-0 w-[calc(100%-1rem)] sm:w-full max-w-2xl mx-2 sm:mx-auto backdrop:bg-black/50';

        dialog.innerHTML = `
            <div class="p-4 sm:p-6">
                <div class="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 class="text-lg sm:text-xl font-semibold text-tarkov-text">Add Condition</h2>
                    <button type="button" id="closeConditionDialog" class="text-tarkov-text-muted hover:text-tarkov-text text-2xl">&times;</button>
                </div>

                <form id="conditionForm">
                    <!-- Common fields -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                        <div class="form-group">
                            <label for="conditionType">Condition Type</label>
                            <select id="conditionType" name="conditionType" class="w-full"></select>
                        </div>
                        <div class="form-group">
                            <label for="conditionCategory">Category</label>
                            <select id="conditionCategory" name="category" class="w-full">
                                <option value="AvailableForStart">Available For Start</option>
                                <option value="AvailableForFinish">Available For Finish</option>
                                <option value="Fail">Fail</option>
                            </select>
                        </div>
                    </div>

                    <!-- Dynamic fields container -->
                    <div id="conditionFields" class="space-y-4 mb-6"></div>

                    <!-- Actions -->
                    <div class="flex justify-end gap-2">
                        <button type="button" id="cancelCondition" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Condition</button>
                    </div>
                </form>
            </div>
        `;

        return dialog;
    }

    private handleSubmit(): void {
        const form = this.dialog.querySelector('#conditionForm') as HTMLFormElement;
        const formData = new FormData(form);

        const type = formData.get('conditionType') as ConditionType;
        const category = formData.get('category') as ConditionCategory;
        const id = this.editingCondition?.id || generateId();

        const baseCondition: QuestCondition = {
            conditionType       : type,
            dynamicLocale       : false,
            globalQuestCounterId: '',
            id,
            index               : this.editingCondition?.index || 0,
            parentId            : '',
            visibilityConditions: [],
        };

        let condition: QuestCondition;

        switch (type) {
            case 'CounterCreator': {
                const counterConditionType = formData.get('counterConditionType') as string || 'Kills';
                const counterId = generateId();

                let counterConditions;

                switch (counterConditionType) {
                    case 'ExitName': {
                        counterConditions = [{
                            conditionType: 'ExitName',
                            dynamicLocale: false,
                            exitName     : formData.get('exitName') as string,
                            id           : generateId(),
                        }];
                        condition = {
                            ...baseCondition,
                            counter       : {conditions: counterConditions, id: counterId},
                            oneSessionOnly: false,
                            type          : 'Completion',
                            value         : parseInt(formData.get('value') as string) || 1,
                        };
                        break;
                    }
                    case 'ExitStatus': {
                        const statuses = Array.from(formData.getAll('exitStatus')) as string[];
                        counterConditions = [{
                            conditionType: 'ExitStatus',
                            dynamicLocale: false,
                            id           : generateId(),
                            status       : statuses.length > 0 ? statuses : ['Survived'],
                        }];
                        condition = {
                            ...baseCondition,
                            counter       : {conditions: counterConditions, id: counterId},
                            oneSessionOnly: false,
                            type          : 'Completion',
                            value         : parseInt(formData.get('value') as string) || 1,
                        };
                        break;
                    }
                    case 'Location': {
                        const locations = Array.from(formData.getAll('locations')) as string[];
                        counterConditions = [{
                            conditionType: 'Location',
                            dynamicLocale: false,
                            id           : generateId(),
                            location     : locations.length > 0 ? locations : ['any'],
                        }];
                        condition = {
                            ...baseCondition,
                            counter       : {conditions: counterConditions, id: counterId},
                            oneSessionOnly: false,
                            type          : 'Completion',
                            value         : parseInt(formData.get('value') as string) || 1,
                        };
                        break;
                    }
                    case 'VisitPlace': {
                        counterConditions = [{
                            conditionType: 'VisitPlace',
                            dynamicLocale: false,
                            id           : generateId(),
                            target       : formData.get('zoneId') as string,
                        }];
                        condition = {
                            ...baseCondition,
                            counter       : {conditions: counterConditions, id: counterId},
                            oneSessionOnly: false,
                            type          : 'Exploration',
                            value         : 1,
                        };
                        break;
                    }
                    case 'Kills':
                    default: {
                        const selectedWeapons = formData.get('weapon') as string;
                        const weaponIds = selectedWeapons ? selectedWeapons.split(',').filter(w => w.trim()) : [];
                        const bodyPartValue = formData.get('bodyPart') as string;
                        const targetValue = formData.get('target') as string;
                        counterConditions = [{
                            bodyPart               : bodyPartValue !== 'Any' ? [bodyPartValue] : undefined,
                            conditionType          : 'Kills',
                            daytime                : {from: 0, to: 0},
                            distance               : {compareMethod: '>=', value: 0},
                            dynamicLocale          : false,
                            enemyEquipmentExclusive: [],
                            enemyEquipmentInclusive: [],
                            enemyHealthEffects     : [],
                            id                     : generateId(),
                            resetOnSessionEnd      : false,
                            savageRole             : targetValue !== 'Any' ? [targetValue] : undefined,
                            target                 : targetValue,
                            weapon                 : weaponIds,
                            weaponCaliber          : [],
                            weaponModsExclusive    : [],
                            weaponModsInclusive    : [],
                        }];
                        condition = {
                            ...baseCondition,
                            counter       : {conditions: counterConditions, id: counterId},
                            oneSessionOnly: false,
                            type          : 'Elimination',
                            value         : parseInt(formData.get('value') as string) || 1,
                        };
                        break;
                    }
                }
                break;
            }


            case 'FindItem':
            case 'HandoverItem': {
                const targets = (formData.get('target') as string).split(',').map(t => t.trim());
                condition = {
                    ...baseCondition,
                    countInRaid    : formData.get('countInRaid') === 'on',
                    dogtagLevel    : 0,
                    isEncoded      : false,
                    maxDurability  : 100,
                    minDurability  : 0,
                    onlyFoundInRaid: formData.get('onlyFoundInRaid') === 'on',
                    target         : targets,
                    value          : parseInt(formData.get('value') as string) || 1,
                };
                break;
            }

            case 'LeaveItemAtLocation':
                condition = {
                    ...baseCondition,
                    onlyFoundInRaid: formData.get('onlyFoundInRaid') === 'on',
                    target         : [formData.get('target') as string],
                    zoneId         : formData.get('zoneId') as string,
                };
                break;

            case 'Level':
                condition = {
                    ...baseCondition,
                    compareMethod: formData.get('compareMethod') as string,
                    value        : parseInt(formData.get('value') as string) || 1,
                };
                break;

            case 'PlaceBeacon':
                condition = {
                    ...baseCondition,
                    onlyFoundInRaid: formData.get('onlyFoundInRaid') === 'on',
                    plantTime      : parseInt(formData.get('plantTime') as string) || 0,
                    target         : [formData.get('target') as string],
                    value          : parseInt(formData.get('value') as string) || 1,
                    zoneId         : formData.get('zoneId') as string,
                };
                break;

            case 'Quest':
                condition = {
                    ...baseCondition,
                    availableAfter: 0,
                    status        : [parseInt(formData.get('status') as string)],
                    target        : formData.get('target') as string,
                };
                break;

            case 'Skill':
                condition = {
                    ...baseCondition,
                    compareMethod: formData.get('compareMethod') as string,
                    target       : formData.get('target') as string,
                    value        : parseInt(formData.get('value') as string) || 0,
                };
                break;

            case 'TraderLoyalty':
                condition = {
                    ...baseCondition,
                    compareMethod: formData.get('compareMethod') as string,
                    target       : formData.get('target') as string,
                    value        : parseInt(formData.get('value') as string) || 1,
                };
                break;

            case 'VisitPlace':
                condition = {
                    ...baseCondition,
                    target: formData.get('target') as string,
                };
                break;

            default:
                return;
        }

        if (this.onSave) {
            this.onSave(condition, category);
        }

        this.close();
    }

    private populateFieldsWithCondition(condition: QuestCondition): void {
        switch (condition.conditionType) {
            case 'CounterCreator': {
                const subCondition = condition.counter?.conditions?.[0];
                if (subCondition) {
                    const subType = subCondition.conditionType || 'Kills';
                    this.setFieldValue('counterConditionType', subType);

                    // Trigger field update for the sub-condition type
                    this.updateCounterSubFields(subType);

                    switch (subType) {
                        case 'ExitName':
                            this.setFieldValue('exitName', subCondition.exitName || '');
                            break;
                        case 'ExitStatus':
                            // Handle multi-select for statuses
                            if (subCondition.status) {
                                subCondition.status.forEach(s => {
                                    const checkbox = this.dialog.querySelector(`input[name="exitStatus"][value="${s}"]`) as HTMLInputElement;
                                    if (checkbox) checkbox.checked = true;
                                });
                            }
                            break;
                        case 'Kills':
                            this.setFieldValue('target', subCondition.target || subCondition.savageRole?.[0] || 'Any');
                            this.setFieldValue('bodyPart', subCondition.bodyPart?.[0] || 'Any');
                            if (subCondition.weapon && subCondition.weapon.length > 0) {
                                this.setFieldValue('weapon', subCondition.weapon[0]);
                            }
                            break;
                        case 'Location':
                            // Handle multi-select for locations
                            if (subCondition.location) {
                                subCondition.location.forEach(loc => {
                                    const checkbox = this.dialog.querySelector(`input[name="locations"][value="${loc}"]`) as HTMLInputElement;
                                    if (checkbox) checkbox.checked = true;
                                });
                            }
                            break;
                        case 'VisitPlace':
                            this.setFieldValue('zoneId', subCondition.target || '');
                            break;
                    }
                }
                this.setFieldValue('value', String(condition.value || 1));
                break;
            }

            case 'FindItem':
            case 'HandoverItem': {
                const targets = Array.isArray(condition.target) ? condition.target.join(', ') : condition.target;
                this.setFieldValue('target', targets || '');
                this.setFieldValue('value', String(condition.value || 1));
                this.setCheckboxValue('onlyFoundInRaid', condition.onlyFoundInRaid || false);
                this.setCheckboxValue('countInRaid', condition.countInRaid || false);
                break;
            }

            case 'LeaveItemAtLocation': {
                const target = Array.isArray(condition.target) ? condition.target[0] : condition.target;
                this.setFieldValue('target', target || '');
                this.setFieldValue('zoneId', condition.zoneId || '');
                this.setCheckboxValue('onlyFoundInRaid', condition.onlyFoundInRaid || false);
                break;
            }

            case 'Level':
                this.setFieldValue('compareMethod', condition.compareMethod || '>=');
                this.setFieldValue('value', String(condition.value || 1));
                break;

            case 'PlaceBeacon': {
                const target = Array.isArray(condition.target) ? condition.target[0] : condition.target;
                this.setFieldValue('target', target || '');
                this.setFieldValue('zoneId', condition.zoneId || '');
                this.setFieldValue('plantTime', String(condition.plantTime || 0));
                this.setFieldValue('value', String(condition.value || 1));
                this.setCheckboxValue('onlyFoundInRaid', condition.onlyFoundInRaid || false);
                break;
            }

            case 'Quest':
                this.setFieldValue('target', condition.target as string || '');
                this.setFieldValue('status', String(condition.status?.[0] || 4));
                break;

            case 'Skill':
                this.setFieldValue('target', condition.target as string || '');
                this.setFieldValue('compareMethod', condition.compareMethod || '>=');
                this.setFieldValue('value', String(condition.value || 0));
                break;

            case 'TraderLoyalty':
                this.setFieldValue('target', condition.target as string || '');
                this.setFieldValue('compareMethod', condition.compareMethod || '>=');
                this.setFieldValue('value', String(condition.value || 1));
                break;

            case 'VisitPlace':
                this.setFieldValue('target', condition.target as string || '');
                break;
        }
    }

    private populateSelects(): void {
        const typeSelect = this.dialog.querySelector('#conditionType') as HTMLSelectElement;
        CONDITION_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
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

    private updateCounterSubFields(subType: string): void {
        const subContainer = this.dialog.querySelector('#counterSubFields');
        if (!subContainer) return;

        const weaponOptionsHtml = WEAPON_CATEGORIES.map(cat => `
            <optgroup label="${cat.category}">
                ${cat.weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
            </optgroup>
        `).join('');

        switch (subType) {
            case 'ExitName':
                subContainer.innerHTML = `
                    <div class="form-group">
                        <label for="exitName">Exit Name</label>
                        <input type="text" id="exitName" name="exitName" class="w-full" placeholder="Exact extract point name" />
                        <p class="text-xs text-tarkov-text-muted mt-1">The exact name of the extraction point</p>
                    </div>
                `;
                break;
            case 'ExitStatus':
                subContainer.innerHTML = `
                    <div class="form-group">
                        <label>Exit Status (select one or more)</label>
                        <div class="grid grid-cols-2 gap-2 mt-2">
                            ${EXIT_STATUSES.map(s => `
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="exitStatus" value="${s}" ${s === 'Survived' ? 'checked' : ''} class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                                    <span>${s}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
                break;
            case 'Kills':
                subContainer.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="elimTarget">Target</label>
                            <select id="elimTarget" name="target" class="w-full">
                                ${ELIMINATION_TARGETS.map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="elimBodyPart">Body Part</label>
                            <select id="elimBodyPart" name="bodyPart" class="w-full">
                                ${BODY_PARTS.map(b => `<option value="${b}">${b}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="elimWeapon">Required Weapon (optional)</label>
                        <select id="elimWeapon" name="weapon" class="w-full">
                            <option value="">Any Weapon</option>
                            ${weaponOptionsHtml}
                        </select>
                    </div>
                `;
                break;
            case 'Location':
                subContainer.innerHTML = `
                    <div class="form-group">
                        <label>Locations (select one or more)</label>
                        <div class="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                            ${LOCATIONS.filter(l => l !== 'any').map(l => `
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="locations" value="${l}" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                                    <span>${l}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
                break;
            case 'VisitPlace':
                subContainer.innerHTML = `
                    <div class="form-group">
                        <label for="zoneId">Zone ID</label>
                        <input type="text" id="zoneId" name="zoneId" class="w-full" placeholder="Zone identifier to visit" />
                    </div>
                `;
                break;
            default:
                subContainer.innerHTML = '';
        }
    }

    private updateFields(type: ConditionType): void {
        const container = this.dialog.querySelector('#conditionFields')!;

        switch (type) {
            case 'CounterCreator': {
                container.innerHTML = `
                    <div class="form-group mb-4">
                        <label for="counterConditionType">Sub-Condition Type</label>
                        <select id="counterConditionType" name="counterConditionType" class="w-full">
                            ${COUNTER_CONDITION_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    <div id="counterSubFields"></div>
                    <div class="form-group mt-4">
                        <label for="elimValue">Count/Value</label>
                        <input type="number" id="elimValue" name="value" class="w-full" min="1" value="1" />
                    </div>
                `;

                // Bind change event for sub-type
                const subTypeSelect = container.querySelector('#counterConditionType') as HTMLSelectElement;
                subTypeSelect?.addEventListener('change', () => {
                    this.updateCounterSubFields(subTypeSelect.value);
                });

                // Initialize with Kills fields
                this.updateCounterSubFields('Kills');
                break;
            }


            case 'FindItem':
            case 'HandoverItem':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="itemTarget">Item Template ID(s)</label>
                            <input type="text" id="itemTarget" name="target" class="w-full" placeholder="Comma-separated IDs" />
                        </div>
                        <div class="form-group">
                            <label for="itemValue">Count</label>
                            <input type="number" id="itemValue" name="value" class="w-full" min="1" value="1" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="onlyFoundInRaid" checked class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Found in Raid Only</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="countInRaid" class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Count in Raid</span>
                        </label>
                    </div>
                `;
                break;

            case 'LeaveItemAtLocation':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="leaveItem">Item Template ID</label>
                            <input type="text" id="leaveItem" name="target" class="w-full" placeholder="Item to leave" />
                        </div>
                        <div class="form-group">
                            <label for="leaveZone">Zone ID</label>
                            <input type="text" id="leaveZone" name="zoneId" class="w-full" placeholder="Drop zone" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="onlyFoundInRaid" checked class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Found in Raid Only</span>
                        </label>
                    </div>
                `;
                break;

            case 'Level':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="levelCompare">Compare</label>
                            <select id="levelCompare" name="compareMethod" class="w-full">
                                ${COMPARE_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="levelValue">Level</label>
                            <input type="number" id="levelValue" name="value" class="w-full" min="1" max="79" value="1" />
                        </div>
                    </div>
                `;
                break;

            case 'PlaceBeacon':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="beaconItem">Item Template ID</label>
                            <input type="text" id="beaconItem" name="target" class="w-full" placeholder="Beacon/item to place" />
                        </div>
                        <div class="form-group">
                            <label for="beaconZone">Zone ID</label>
                            <input type="text" id="beaconZone" name="zoneId" class="w-full" placeholder="Target zone" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="plantTime">Plant Time (seconds)</label>
                            <input type="number" id="plantTime" name="plantTime" class="w-full" min="0" value="0" />
                        </div>
                        <div class="form-group">
                            <label for="beaconValue">Quantity</label>
                            <input type="number" id="beaconValue" name="value" class="w-full" min="1" value="1" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="onlyFoundInRaid" checked class="rounded border-tarkov-border bg-tarkov-surface text-tarkov-accent" />
                            <span>Found in Raid Only</span>
                        </label>
                    </div>
                `;
                break;

            case 'Quest':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="questTarget">Quest ID</label>
                            <input type="text" id="questTarget" name="target" class="w-full" placeholder="Required quest ID" />
                        </div>
                        <div class="form-group">
                            <label for="questStatus">Required Status</label>
                            <select id="questStatus" name="status" class="w-full">
                                ${QUEST_STATUSES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
                break;

            case 'Skill':
                container.innerHTML = `
                    <div class="grid grid-cols-3 gap-4">
                        <div class="form-group">
                            <label for="skillTarget">Skill</label>
                            <select id="skillTarget" name="target" class="w-full">
                                ${SKILLS.map(s => `<option value="${s}">${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="skillCompare">Compare</label>
                            <select id="skillCompare" name="compareMethod" class="w-full">
                                ${COMPARE_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="skillValue">Level</label>
                            <input type="number" id="skillValue" name="value" class="w-full" min="0" value="0" />
                        </div>
                    </div>
                `;
                break;

            case 'TraderLoyalty':
                container.innerHTML = `
                    <div class="grid grid-cols-3 gap-4">
                        <div class="form-group">
                            <label for="tlTrader">Trader</label>
                            <select id="tlTrader" name="target" class="w-full">
                                ${Object.keys(TRADERS).map(t => `<option value="${t}">${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tlCompare">Compare</label>
                            <select id="tlCompare" name="compareMethod" class="w-full">
                                ${COMPARE_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tlLevel">Level</label>
                            <input type="number" id="tlLevel" name="value" class="w-full" min="1" max="4" value="1" />
                        </div>
                    </div>
                `;
                break;

            case 'VisitPlace':
                container.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-group">
                            <label for="visitZone">Zone ID</label>
                            <input type="text" id="visitZone" name="target" class="w-full" placeholder="Zone identifier" />
                        </div>
                        <div class="form-group">
                            <label for="visitLocation">Location</label>
                            <select id="visitLocation" name="location" class="w-full">
                                ${LOCATIONS.map(l => `<option value="${l}">${l}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
                break;

            default:
                container.innerHTML = '<p class="text-tarkov-text-muted">Select a condition type</p>';
        }
    }
}
