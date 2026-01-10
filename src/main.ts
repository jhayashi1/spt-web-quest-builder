import './styles/main.css';
import type {QuestCondition} from './types/condition';
import type {Reward} from './types/reward';

import {AssortBuilder} from './components/assort-builder';
import {ConditionBuilder, type ConditionCategory} from './components/condition-builder';
import {RewardBuilder} from './components/reward-builder';
import {WeaponBuilder} from './components/weapon-builder';
import {FACTIONS} from './constants/factions';
import {LOCATIONS} from './constants/locations';
import {QUEST_TYPES} from './constants/quest-types';
import {type RewardTiming} from './constants/rewards';
import {type TraderName, TRADERS} from './constants/traders';
import {type Quest, type QuestFile} from './types/quest';
import {createDefaultMessages, downloadJson, generateId, readJsonFile} from './utils/helpers';

/** Application State */
class QuestBuilder {
    private static readonly STORAGE_KEY = 'spt-quest-builder-quests';
    private assortBuilder: AssortBuilder | null = null;
    private conditionBuilder: ConditionBuilder;
    private currentQuestId: null | string = null;
    private currentTab: 'assort' | 'quests' | 'weapon' = 'quests';
    private quests: QuestFile = {};
    private rewardBuilder: RewardBuilder;
    private weaponBuilder: null | WeaponBuilder = null;

    constructor() {
        this.rewardBuilder = new RewardBuilder();
        this.conditionBuilder = new ConditionBuilder();
        this.initializeUI();
        this.initializeTabs();
        this.bindEvents();
        this.loadFromStorage();
    }

    private bindEvents(): void {
        // New Quest button
        document.getElementById('newQuestBtn')?.addEventListener('click', () => this.newQuest());

        // Save Quest button
        document.getElementById('saveQuestBtn')?.addEventListener('click', () => this.saveCurrentQuest());

        // Export dropdown
        const exportBtn = document.getElementById('exportBtn');
        const exportMenu = document.getElementById('exportMenu');

        exportBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            // Update menu visibility based on current tab
            this.updateExportMenu();
            exportMenu?.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            exportMenu?.classList.add('hidden');
        });

        // Quest exports
        document.getElementById('exportAllBtn')?.addEventListener('click', () => {
            this.exportQuests();
            exportMenu?.classList.add('hidden');
        });

        document.getElementById('exportCurrentBtn')?.addEventListener('click', () => {
            this.exportCurrentQuest();
            exportMenu?.classList.add('hidden');
        });

        // Assort exports
        document.getElementById('exportAllAssortBtn')?.addEventListener('click', () => {
            this.assortBuilder?.exportAssort();
            exportMenu?.classList.add('hidden');
        });

        document.getElementById('exportCurrentAssortBtn')?.addEventListener('click', () => {
            this.assortBuilder?.exportCurrentItem();
            exportMenu?.classList.add('hidden');
        });

        // Weapon exports
        document.getElementById('exportAllWeaponBtn')?.addEventListener('click', () => {
            this.weaponBuilder?.exportPresets();
            exportMenu?.classList.add('hidden');
        });

        document.getElementById('exportCurrentWeaponBtn')?.addEventListener('click', () => {
            this.weaponBuilder?.exportCurrentPreset();
            exportMenu?.classList.add('hidden');
        });

        // Import button - context-aware
        document.getElementById('importBtn')?.addEventListener('click', () => {
            this.handleImport();
        });

        // File input change - context-aware
        document.getElementById('importFile')?.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            if (input.files?.[0]) {
                this.handleImportFile(input.files[0]);
                input.value = ''; // Reset for re-import
            }
        });

        // Quest list selection and deletion
        document.getElementById('questList')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Handle delete button click
            if (target.classList.contains('quest-delete-btn')) {
                e.stopPropagation();
                const questId = target.dataset.id!;
                this.deleteQuest(questId);
                return;
            }

            // Handle quest item click (select quest)
            const questItem = target.closest('.quest-item') as HTMLElement;
            if (questItem) {
                this.loadQuest(questItem.dataset.id!);
            }
        });

        // Add Reward button
        document.getElementById('addRewardBtn')?.addEventListener('click', () => this.openRewardBuilder());

        // Add Condition button
        document.getElementById('addConditionBtn')?.addEventListener('click', () => this.openConditionBuilder());
    }

    private clearForm(): void {
        const form = document.getElementById('questForm') as HTMLFormElement;
        form.reset();
        const idDisplay = document.getElementById('questIdDisplay');
        if (idDisplay) idDisplay.textContent = '-';
    }

    private deleteCondition(conditionId: string, category: ConditionCategory): void {
        if (!this.currentQuestId) return;
        const quest = this.quests[this.currentQuestId];
        quest.conditions[category] = quest.conditions[category].filter(c => c.id !== conditionId);
        this.updateConditionsList();
        this.saveToStorage();
    }

    private deleteQuest(questId: string): void {
        if (!questId) return;

        const quest = this.quests[questId];
        if (!quest) return;

        if (confirm(`Are you sure you want to delete "${quest.QuestName}"?`)) {
            delete this.quests[questId];

            // If we deleted the currently selected quest, clear the form
            if (this.currentQuestId === questId) {
                this.currentQuestId = null;
                this.clearForm();
            }

            this.updateQuestList();
            this.saveToStorage();
        }
    }

    private deleteReward(rewardId: string, timing: RewardTiming): void {
        if (!this.currentQuestId) return;
        const quest = this.quests[this.currentQuestId];
        quest.rewards[timing] = quest.rewards[timing].filter(r => r.id !== rewardId);
        this.updateRewardsList();
        this.saveToStorage();
    }

    private editCondition(conditionId: string, category: ConditionCategory): void {
        if (!this.currentQuestId) return;
        const quest = this.quests[this.currentQuestId];
        const condition = quest.conditions[category].find(c => c.id === conditionId);
        if (!condition) return;

        this.conditionBuilder.open((updatedCondition: QuestCondition, newCategory: ConditionCategory) => {
            // If category changed, move the condition
            if (newCategory !== category) {
                quest.conditions[category] = quest.conditions[category].filter(c => c.id !== conditionId);
                quest.conditions[newCategory].push(updatedCondition);
            } else {
                // Update in place
                const index = quest.conditions[category].findIndex(c => c.id === conditionId);
                if (index !== -1) {
                    quest.conditions[category][index] = updatedCondition;
                }
            }
            this.updateConditionsList();
            this.saveToStorage();
            this.showToast(`Updated ${updatedCondition.conditionType} condition`);
        }, condition, category);
    }

    private editReward(rewardId: string, timing: RewardTiming): void {
        if (!this.currentQuestId) return;
        const quest = this.quests[this.currentQuestId];
        const reward = quest.rewards[timing].find(r => r.id === rewardId);
        if (!reward) return;

        this.rewardBuilder.open((updatedReward: Reward, newTiming: RewardTiming) => {
            // If timing changed, move the reward
            if (newTiming !== timing) {
                quest.rewards[timing] = quest.rewards[timing].filter(r => r.id !== rewardId);
                quest.rewards[newTiming].push(updatedReward);
            } else {
                // Update in place
                const index = quest.rewards[timing].findIndex(r => r.id === rewardId);
                if (index !== -1) {
                    quest.rewards[timing][index] = updatedReward;
                }
            }
            this.updateRewardsList();
            this.saveToStorage();
            this.showToast(`Updated ${updatedReward.type} reward`);
        }, reward, timing);
    }

    private exportCurrentQuest(): void {
        if (!this.currentQuestId) {
            alert('No quest selected. Select a quest first.');
            return;
        }

        const quest = this.quests[this.currentQuestId];
        const exportData: QuestFile = {[this.currentQuestId]: quest};
        const filename = `${quest.QuestName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;

        downloadJson(exportData, filename);
        this.showToast(`Exported: ${quest.QuestName}`);
    }

    private exportQuests(): void {
        if (Object.keys(this.quests).length === 0) {
            alert('No quests to export');
            return;
        }

        downloadJson(this.quests, 'quests.json');
        this.showToast(`Exported ${Object.keys(this.quests).length} quest(s)!`);
    }

    private getConditionsCount(quest: Quest): number {
        return quest.conditions.AvailableForStart.length +
               quest.conditions.AvailableForFinish.length +
               quest.conditions.Fail.length;
    }

    private getRewardsCount(quest: Quest): number {
        return quest.rewards.Success.length + quest.rewards.Started.length + quest.rewards.Fail.length;
    }

    private getRewardValueDisplay(reward: Reward): string {
        switch (reward.type) {
            case 'Experience':
            case 'StashRows':
                return `<span class="text-tarkov-text-muted ml-2">(${reward.value})</span>`;
            case 'Skill':
                return `<span class="text-tarkov-text-muted ml-2">(${reward.target}: ${reward.value})</span>`;
            case 'TraderStanding':
                return `<span class="text-tarkov-text-muted ml-2">(${reward.value > 0 ? '+' : ''}${reward.value})</span>`;
            default:
                return '';
        }
    }

    private handleExportAll(): void {
        if (this.currentTab === 'assort' && this.assortBuilder) {
            this.assortBuilder.exportAssort();
        } else if (this.currentTab === 'weapon' && this.weaponBuilder) {
            this.weaponBuilder.exportPresets();
        } else {
            this.exportQuests();
        }
    }

    private handleExportCurrent(): void {
        if (this.currentTab === 'quests') {
            this.exportCurrentQuest();
        } else if (this.currentTab === 'assort' && this.assortBuilder) {
            this.assortBuilder.exportCurrentItem();
        } else if (this.currentTab === 'weapon' && this.weaponBuilder) {
            this.weaponBuilder.exportCurrentPreset();
        }
    }

    private handleImport(): void {
        document.getElementById('importFile')?.click();
    }

    private handleImportFile(file: File): void {
        if (this.currentTab === 'assort' && this.assortBuilder) {
            this.assortBuilder.importAssort(file);
        } else if (this.currentTab === 'weapon' && this.weaponBuilder) {
            this.weaponBuilder.importPresets(file);
        } else {
            this.importQuests(file);
        }
    }

    private async importQuests(file: File): Promise<void> {
        try {
            const imported = await readJsonFile<QuestFile>(file);
            let count = 0;

            for (const [id, quest] of Object.entries(imported)) {
                this.quests[id] = quest;
                count++;
            }

            this.updateQuestList();
            this.saveToStorage();
            this.showToast(`Imported ${count} quest(s)`);
        } catch (err) {
            alert(`Failed to import: ${err}`);
        }
    }

    private initializeTabs(): void {
        const tabQuests = document.getElementById('tabQuests');
        const tabAssort = document.getElementById('tabAssort');
        const tabWeapon = document.getElementById('tabWeapon');
        const questTab = document.getElementById('questBuilderTab');
        const assortTab = document.getElementById('assortBuilderTab');
        const weaponTab = document.getElementById('weaponBuilderTab');

        console.log('Initializing tabs:', {assortTab, questTab, tabAssort, tabQuests, tabWeapon, weaponTab});

        tabQuests?.addEventListener('click', () => {
            console.log('Quest tab clicked');
            tabQuests.classList.add('active');
            tabAssort?.classList.remove('active');
            tabWeapon?.classList.remove('active');
            questTab?.classList.remove('hidden');
            assortTab?.classList.add('hidden');
            weaponTab?.classList.add('hidden');
            this.updateHeaderButtons('quests');
        });

        tabAssort?.addEventListener('click', () => {
            console.log('Assort tab clicked');
            tabAssort.classList.add('active');
            tabQuests?.classList.remove('active');
            tabWeapon?.classList.remove('active');
            assortTab?.classList.remove('hidden');
            questTab?.classList.add('hidden');
            weaponTab?.classList.add('hidden');
            this.updateHeaderButtons('assort');

            // Lazy-initialize the assort builder
            if (!this.assortBuilder) {
                console.log('Creating AssortBuilder');
                this.assortBuilder = new AssortBuilder('assortBuilderContainer');
            }
        });

        tabWeapon?.addEventListener('click', () => {
            console.log('Weapon tab clicked');
            tabWeapon.classList.add('active');
            tabQuests?.classList.remove('active');
            tabAssort?.classList.remove('active');
            weaponTab?.classList.remove('hidden');
            questTab?.classList.add('hidden');
            assortTab?.classList.add('hidden');
            this.updateHeaderButtons('weapon');

            // Lazy-initialize the weapon builder
            if (!this.weaponBuilder) {
                console.log('Creating WeaponBuilder');
                this.weaponBuilder = new WeaponBuilder('weaponBuilderContainer');
            }
        });
    }

    private initializeUI(): void {
        // Populate trader select
        const traderSelect = document.getElementById('trader') as HTMLSelectElement;
        Object.keys(TRADERS).forEach(trader => {
            const option = document.createElement('option');
            option.value = trader;
            option.textContent = trader;
            traderSelect.appendChild(option);
        });

        // Populate location select
        const locationSelect = document.getElementById('location') as HTMLSelectElement;
        LOCATIONS.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            locationSelect.appendChild(option);
        });

        // Populate quest type select
        const typeSelect = document.getElementById('questType') as HTMLSelectElement;
        QUEST_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });

        // Populate faction select
        const factionSelect = document.getElementById('faction') as HTMLSelectElement;
        FACTIONS.forEach(faction => {
            const option = document.createElement('option');
            option.value = faction;
            option.textContent = faction.toUpperCase();
            factionSelect.appendChild(option);
        });
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(QuestBuilder.STORAGE_KEY);
            if (stored) {
                this.quests = JSON.parse(stored);
                this.updateQuestList();

                // Load the first quest if available
                const firstQuestId = Object.keys(this.quests)[0];
                if (firstQuestId) {
                    this.loadQuest(firstQuestId);
                }
            }
        } catch (err) {
            console.error('Failed to load quests from storage:', err);
        }
    }

    private loadQuest(id: string): void {
        const quest = this.quests[id];
        if (!quest) return;

        this.currentQuestId = id;
        this.loadQuestToForm(quest);

        // Update selection visual
        document.querySelectorAll('.quest-item').forEach(el => {
            el.classList.remove('bg-tarkov-surface-light');
        });
        document.querySelector(`[data-id="${id}"]`)?.classList.add('bg-tarkov-surface-light');
    }

    private loadQuestToForm(quest: Quest): void {
        const form = document.getElementById('questForm') as HTMLFormElement;

        // Find trader name from ID
        const traderName = Object.entries(TRADERS).find(([_, id]) => id === quest.traderId)?.[0] || 'Prapor';

        (form.querySelector('[name="questName"]') as HTMLInputElement).value = quest.QuestName;
        (form.querySelector('[name="trader"]') as HTMLSelectElement).value = traderName;
        (form.querySelector('[name="location"]') as HTMLSelectElement).value = quest.location;
        (form.querySelector('[name="questType"]') as HTMLSelectElement).value = quest.type;
        (form.querySelector('[name="faction"]') as HTMLSelectElement).value = quest.side;
        (form.querySelector('[name="description"]') as HTMLTextAreaElement).value = quest.description;
        (form.querySelector('[name="imagePath"]') as HTMLInputElement).value = quest.image || '/files/quest/icon/quest.png';
        (form.querySelector('[name="instantComplete"]') as HTMLInputElement).checked = quest.instantComplete;
        (form.querySelector('[name="restartable"]') as HTMLInputElement).checked = quest.restartable;
        (form.querySelector('[name="secretQuest"]') as HTMLInputElement).checked = quest.secretQuest;
        (form.querySelector('[name="isKey"]') as HTMLInputElement).checked = quest.isKey;
        (form.querySelector('[name="canShowNotifications"]') as HTMLInputElement).checked = quest.canShowNotificationsInGame;

        // Load locale message fields
        (form.querySelector('[name="acceptPlayerMessage"]') as HTMLTextAreaElement).value = quest.acceptPlayerMessage || '';
        (form.querySelector('[name="declinePlayerMessage"]') as HTMLTextAreaElement).value = quest.declinePlayerMessage || '';
        (form.querySelector('[name="completePlayerMessage"]') as HTMLTextAreaElement).value = quest.completePlayerMessage || '';
        (form.querySelector('[name="startedMessageText"]') as HTMLTextAreaElement).value = quest.startedMessageText || '';
        (form.querySelector('[name="successMessageText"]') as HTMLTextAreaElement).value = quest.successMessageText || '';
        (form.querySelector('[name="failMessageText"]') as HTMLTextAreaElement).value = quest.failMessageText || '';
        (form.querySelector('[name="changeQuestMessageText"]') as HTMLTextAreaElement).value = quest.changeQuestMessageText || '';
        (form.querySelector('[name="note"]') as HTMLTextAreaElement).value = quest.note || '';

        // Update ID display
        const idDisplay = document.getElementById('questIdDisplay');
        if (idDisplay) idDisplay.textContent = quest._id;

        // Update rewards and conditions lists
        this.updateRewardsList();
        this.updateConditionsList();
    }

    private newQuest(): void {
        const id = generateId();
        const messages = createDefaultMessages(id);

        const quest: Quest = {
            _id                         : id,
            QuestName                   : 'New Quest',
            ...messages,
            acceptanceAndFinishingSource: 'eft',
            arenaLocations              : [],
            canShowNotificationsInGame  : true,
            conditions                  : {
                AvailableForFinish: [],
                AvailableForStart : [],
                Fail              : [],
            },
            gameModes      : [],
            image          : '/files/quest/icon/quest.png',
            instantComplete: false,
            isKey          : false,
            location       : 'any',
            progressSource : 'eft',
            rankingModes   : [],
            restartable    : false,
            rewards        : {
                Fail   : [],
                Started: [],
                Success: [],
            },
            secretQuest: false,
            side       : 'pmc',
            traderId   : TRADERS.Prapor,
            type       : 'PickUp',
        };

        this.quests[id] = quest;
        this.currentQuestId = id;
        this.updateQuestList();
        this.loadQuestToForm(quest);
        this.updateRewardsList();
        this.updateConditionsList();
        this.saveToStorage();
    }

    private openConditionBuilder(): void {
        if (!this.currentQuestId) {
            alert('Create or select a quest first.');
            return;
        }

        this.conditionBuilder.open((condition: QuestCondition, category: ConditionCategory) => {
            const quest = this.quests[this.currentQuestId!];
            quest.conditions[category].push(condition);
            this.updateConditionsList();
            this.saveToStorage();
            this.showToast(`Added ${condition.conditionType} condition`);
        });
    }

    private openRewardBuilder(): void {
        if (!this.currentQuestId) {
            alert('Create or select a quest first.');
            return;
        }

        this.rewardBuilder.open((reward: Reward, timing: RewardTiming) => {
            const quest = this.quests[this.currentQuestId!];
            quest.rewards[timing].push(reward);
            this.updateRewardsList();
            this.saveToStorage();
            this.showToast(`Added ${reward.type} reward`);
        });
    }

    private saveCurrentQuest(): void {
        if (!this.currentQuestId) {
            alert('No quest selected. Create a new quest first.');
            return;
        }

        const form = document.getElementById('questForm') as HTMLFormElement;
        const formData = new FormData(form);

        const traderName = formData.get('trader') as TraderName;

        const quest: Quest = {
            ...this.quests[this.currentQuestId],
            acceptanceAndFinishingSource: this.quests[this.currentQuestId].acceptanceAndFinishingSource || 'eft',
            acceptPlayerMessage         : formData.get('acceptPlayerMessage') as string || this.quests[this.currentQuestId].acceptPlayerMessage,
            arenaLocations              : this.quests[this.currentQuestId].arenaLocations || [],
            canShowNotificationsInGame  : formData.get('canShowNotifications') === 'on',
            changeQuestMessageText      : formData.get('changeQuestMessageText') as string || this.quests[this.currentQuestId].changeQuestMessageText,
            completePlayerMessage       : formData.get('completePlayerMessage') as string || this.quests[this.currentQuestId].completePlayerMessage,
            declinePlayerMessage        : formData.get('declinePlayerMessage') as string || this.quests[this.currentQuestId].declinePlayerMessage,
            description                 : formData.get('description') as string,
            failMessageText             : formData.get('failMessageText') as string || this.quests[this.currentQuestId].failMessageText,
            gameModes                   : this.quests[this.currentQuestId].gameModes || [],
            image                       : (formData.get('imagePath') as string) || '/files/quest/icon/quest.png',
            instantComplete             : formData.get('instantComplete') === 'on',
            isKey                       : formData.get('isKey') === 'on',
            location                    : formData.get('location') as Quest['location'],
            note                        : formData.get('note') as string || this.quests[this.currentQuestId].note,
            progressSource              : this.quests[this.currentQuestId].progressSource || 'eft',
            QuestName                   : formData.get('questName') as string,
            rankingModes                : this.quests[this.currentQuestId].rankingModes || [],
            restartable                 : formData.get('restartable') === 'on',
            secretQuest                 : formData.get('secretQuest') === 'on',
            side                        : formData.get('faction') as Quest['side'],
            startedMessageText          : formData.get('startedMessageText') as string || this.quests[this.currentQuestId].startedMessageText,
            successMessageText          : formData.get('successMessageText') as string || this.quests[this.currentQuestId].successMessageText,
            traderId                    : TRADERS[traderName],
            type                        : formData.get('questType') as Quest['type'],
        };

        this.quests[this.currentQuestId] = quest;
        this.updateQuestList();
        this.saveToStorage();
        this.showToast('Quest saved!');
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(QuestBuilder.STORAGE_KEY, JSON.stringify(this.quests));
        } catch (err) {
            console.error('Failed to save quests to storage:', err);
        }
    }

    private showToast(message: string): void {
        const toast = document.getElementById('toast')!;
        toast.textContent = message;
        toast.classList.remove('opacity-0');
        toast.classList.add('opacity-100');

        setTimeout(() => {
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0');
        }, 2000);
    }

    private updateConditionsList(): void {
        const list = document.getElementById('conditionsList')!;
        const quest = this.currentQuestId ? this.quests[this.currentQuestId] : null;

        if (!quest || this.getConditionsCount(quest) === 0) {
            list.innerHTML = '<p>No conditions added yet.</p>';
            return;
        }

        list.innerHTML = '';

        for (const category of ['AvailableForStart', 'AvailableForFinish', 'Fail'] as const) {
            quest.conditions[category].forEach(condition => {
                const item = document.createElement('div');
                item.className = 'card-item group cursor-pointer';
                const categoryLabel = category === 'AvailableForStart' ? 'Start' : category === 'AvailableForFinish' ? 'Finish' : 'Fail';
                item.innerHTML = `
                    <div class="flex-1 edit-condition" data-id="${condition.id}" data-category="${category}">
                        <span class="text-tarkov-accent">[${categoryLabel}]</span>
                        <span class="text-tarkov-text">${condition.conditionType}</span>
                    </div>
                    <button type="button" class="delete-condition icon-btn-delete sm:opacity-0 sm:group-hover:opacity-100" data-id="${condition.id}" data-category="${category}">&times;</button>
                `;
                list.appendChild(item);
            });
        }

        // Bind delete buttons
        list.querySelectorAll('.delete-condition').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = e.target as HTMLElement;
                const conditionId = target.dataset.id!;
                const category = target.dataset.category as ConditionCategory;
                this.deleteCondition(conditionId, category);
            });
        });

        // Bind edit handlers
        list.querySelectorAll('.edit-condition').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const conditionId = target.dataset.id!;
                const category = target.dataset.category as ConditionCategory;
                this.editCondition(conditionId, category);
            });
        });
    }

    private updateExportMenu(): void {
        const questOptions = document.getElementById('exportQuestOptions');
        const assortOptions = document.getElementById('exportAssortOptions');
        const weaponOptions = document.getElementById('exportWeaponOptions');

        // Hide all options first
        questOptions?.classList.add('hidden');
        assortOptions?.classList.add('hidden');
        weaponOptions?.classList.add('hidden');

        // Show options based on current tab
        if (this.currentTab === 'quests') {
            questOptions?.classList.remove('hidden');
        } else if (this.currentTab === 'assort') {
            assortOptions?.classList.remove('hidden');
        } else if (this.currentTab === 'weapon') {
            weaponOptions?.classList.remove('hidden');
        }
    }

    private updateHeaderButtons(tab: 'assort' | 'quests' | 'weapon'): void {
        this.currentTab = tab;
        const exportBtn = document.getElementById('exportBtn');
        const exportMenu = document.getElementById('exportMenu');
        const dropdownArrow = exportBtn?.querySelector('svg');

        // Hide dropdown menu when not on quests tab
        exportMenu?.classList.add('hidden');

        // Show/hide dropdown arrow based on tab
        if (dropdownArrow) {
            if (tab === 'quests') {
                dropdownArrow.classList.remove('hidden');
            } else {
                dropdownArrow.classList.add('hidden');
            }
        }
    }

    private updateQuestList(): void {
        const list = document.getElementById('questList')!;
        list.innerHTML = '';

        Object.values(this.quests).forEach(quest => {
            const item = document.createElement('div');
            item.className = `quest-item list-item group ${quest._id === this.currentQuestId ? 'bg-tarkov-surface-light' : ''}`;
            item.dataset.id = quest._id;
            item.innerHTML = `
                <span class="truncate flex-1">${quest.QuestName}</span>
                <button type="button" class="quest-delete-btn icon-btn-delete sm:opacity-0 sm:group-hover:opacity-100" data-id="${quest._id}">&times;</button>
            `;
            list.appendChild(item);
        });
    }

    private updateRewardsList(): void {
        const list = document.getElementById('rewardsList')!;
        const quest = this.currentQuestId ? this.quests[this.currentQuestId] : null;

        if (!quest || this.getRewardsCount(quest) === 0) {
            list.innerHTML = '<p>No rewards added yet.</p>';
            return;
        }

        list.innerHTML = '';

        for (const timing of ['Success', 'Started', 'Fail'] as const) {
            quest.rewards[timing].forEach(reward => {
                const item = document.createElement('div');
                item.className = 'card-item group cursor-pointer';
                item.innerHTML = `
                    <div class="flex-1 edit-reward" data-id="${reward.id}" data-timing="${timing}">
                        <span class="text-tarkov-accent">[${timing}]</span>
                        <span class="text-tarkov-text">${reward.type}</span>
                        ${this.getRewardValueDisplay(reward)}
                    </div>
                    <button type="button" class="delete-reward icon-btn-delete sm:opacity-0 sm:group-hover:opacity-100" data-id="${reward.id}" data-timing="${timing}">&times;</button>
                `;
                list.appendChild(item);
            });
        }

        // Bind delete buttons
        list.querySelectorAll('.delete-reward').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = e.target as HTMLElement;
                const rewardId = target.dataset.id!;
                const timing = target.dataset.timing as RewardTiming;
                this.deleteReward(rewardId, timing);
            });
        });

        // Bind edit handlers
        list.querySelectorAll('.edit-reward').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const rewardId = target.dataset.id!;
                const timing = target.dataset.timing as RewardTiming;
                this.editReward(rewardId, timing);
            });
        });
    }
}

// Initialize app
new QuestBuilder();
