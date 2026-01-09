import './styles/main.css';
import type {QuestCondition} from './types/condition';
import type {Reward} from './types/reward';

import {AssortBuilder} from './components/assort-builder';
import {ConditionBuilder, type ConditionCategory} from './components/condition-builder';
import {RewardBuilder} from './components/reward-builder';
import {FACTIONS} from './constants/factions';
import {LOCATIONS} from './constants/locations';
import {QUEST_TYPES} from './constants/quest-types';
import {type RewardTiming} from './constants/rewards';
import {type TraderName, TRADERS} from './constants/traders';
import {type Quest, type QuestFile} from './types/quest';
import {createDefaultMessages, downloadJson, generateId, readJsonFile} from './utils/helpers';

/** Application State */
class QuestBuilder {
    private assortBuilder: AssortBuilder | null = null;
    private conditionBuilder: ConditionBuilder;
    private currentQuestId: null | string = null;
    private quests: QuestFile = {};
    private rewardBuilder: RewardBuilder;

    constructor() {
        this.rewardBuilder = new RewardBuilder();
        this.conditionBuilder = new ConditionBuilder();
        this.initializeUI();
        this.bindEvents();
        this.initializeTabs();
    }

    private bindEvents(): void {
        // New Quest button
        document.getElementById('newQuestBtn')?.addEventListener('click', () => this.newQuest());

        // Save Quest button
        document.getElementById('saveQuestBtn')?.addEventListener('click', () => this.saveCurrentQuest());

        // Export button
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportQuests());

        // Import button
        document.getElementById('importBtn')?.addEventListener('click', () => {
            document.getElementById('importFile')?.click();
        });

        // File input change
        document.getElementById('importFile')?.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            if (input.files?.[0]) {
                this.importQuests(input.files[0]);
                input.value = ''; // Reset for re-import
            }
        });

        // Quest list selection
        document.getElementById('questList')?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('quest-item')) {
                this.loadQuest(target.dataset.id!);
            }
        });

        // Delete quest button
        document.getElementById('deleteQuestBtn')?.addEventListener('click', () => this.deleteCurrentQuest());

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
    }

    private deleteCurrentQuest(): void {
        if (!this.currentQuestId) return;

        if (confirm('Are you sure you want to delete this quest?')) {
            delete this.quests[this.currentQuestId];
            this.currentQuestId = null;
            this.updateQuestList();
            this.clearForm();
        }
    }

    private deleteReward(rewardId: string, timing: RewardTiming): void {
        if (!this.currentQuestId) return;
        const quest = this.quests[this.currentQuestId];
        quest.rewards[timing] = quest.rewards[timing].filter(r => r.id !== rewardId);
        this.updateRewardsList();
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
            this.showToast(`Updated ${updatedReward.type} reward`);
        }, reward, timing);
    }

    private exportQuests(): void {
        if (Object.keys(this.quests).length === 0) {
            alert('No quests to export');
            return;
        }

        downloadJson(this.quests, 'quests.json');
        this.showToast('Quests exported!');
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

    private async importQuests(file: File): Promise<void> {
        try {
            const imported = await readJsonFile<QuestFile>(file);
            let count = 0;

            for (const [id, quest] of Object.entries(imported)) {
                this.quests[id] = quest;
                count++;
            }

            this.updateQuestList();
            this.showToast(`Imported ${count} quest(s)`);
        } catch (err) {
            alert(`Failed to import: ${err}`);
        }
    }

    private initializeTabs(): void {
        const tabQuests = document.getElementById('tabQuests');
        const tabAssort = document.getElementById('tabAssort');
        const questTab = document.getElementById('questBuilderTab');
        const assortTab = document.getElementById('assortBuilderTab');
        const questActions = document.getElementById('questActions');

        tabQuests?.addEventListener('click', () => {
            tabQuests.classList.add('active');
            tabAssort?.classList.remove('active');
            questTab?.classList.remove('hidden');
            assortTab?.classList.add('hidden');
            questActions?.classList.remove('hidden');
        });

        tabAssort?.addEventListener('click', () => {
            tabAssort.classList.add('active');
            tabQuests?.classList.remove('active');
            assortTab?.classList.remove('hidden');
            questTab?.classList.add('hidden');
            questActions?.classList.add('hidden');

            // Lazy-initialize the assort builder
            if (!this.assortBuilder) {
                this.assortBuilder = new AssortBuilder('assortBuilderContainer');
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
            _id                       : id,
            QuestName                 : 'New Quest',
            ...messages,
            canShowNotificationsInGame: true,
            conditions                : {
                AvailableForFinish: [],
                AvailableForStart : [],
                Fail              : [],
            },
            image          : '/files/quest/icon/quest.png',
            instantComplete: false,
            isKey          : false,
            location       : 'any',
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
            acceptPlayerMessage       : formData.get('acceptPlayerMessage') as string || this.quests[this.currentQuestId].acceptPlayerMessage,
            canShowNotificationsInGame: formData.get('canShowNotifications') === 'on',
            changeQuestMessageText    : formData.get('changeQuestMessageText') as string || this.quests[this.currentQuestId].changeQuestMessageText,
            completePlayerMessage     : formData.get('completePlayerMessage') as string || this.quests[this.currentQuestId].completePlayerMessage,
            declinePlayerMessage      : formData.get('declinePlayerMessage') as string || this.quests[this.currentQuestId].declinePlayerMessage,
            description               : formData.get('description') as string,
            failMessageText           : formData.get('failMessageText') as string || this.quests[this.currentQuestId].failMessageText,
            image                     : (formData.get('imagePath') as string) || '/files/quest/icon/quest.png',
            instantComplete           : formData.get('instantComplete') === 'on',
            isKey                     : formData.get('isKey') === 'on',
            location                  : formData.get('location') as Quest['location'],
            note                      : formData.get('note') as string || this.quests[this.currentQuestId].note,
            QuestName                 : formData.get('questName') as string,
            restartable               : formData.get('restartable') === 'on',
            secretQuest               : formData.get('secretQuest') === 'on',
            side                      : formData.get('faction') as Quest['side'],
            startedMessageText        : formData.get('startedMessageText') as string || this.quests[this.currentQuestId].startedMessageText,
            successMessageText        : formData.get('successMessageText') as string || this.quests[this.currentQuestId].successMessageText,
            traderId                  : TRADERS[traderName],
            type                      : formData.get('questType') as Quest['type'],
        };

        this.quests[this.currentQuestId] = quest;
        this.updateQuestList();
        this.showToast('Quest saved!');
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
                item.className = 'flex items-center justify-between p-2 bg-tarkov-surface rounded border border-tarkov-border hover:border-tarkov-accent cursor-pointer transition-colors';
                const categoryLabel = category === 'AvailableForStart' ? 'Start' : category === 'AvailableForFinish' ? 'Finish' : 'Fail';
                item.innerHTML = `
                    <div class="flex-1 edit-condition" data-id="${condition.id}" data-category="${category}">
                        <span class="text-tarkov-accent">[${categoryLabel}]</span>
                        <span class="text-tarkov-text">${condition.conditionType}</span>
                    </div>
                    <button type="button" class="text-tarkov-danger hover:text-red-400 delete-condition ml-2 px-2" data-id="${condition.id}" data-category="${category}">&times;</button>
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

    private updateQuestList(): void {
        const list = document.getElementById('questList')!;
        list.innerHTML = '';

        Object.values(this.quests).forEach(quest => {
            const item = document.createElement('div');
            item.className = `quest-item p-2 cursor-pointer hover:bg-tarkov-surface-light rounded ${quest._id === this.currentQuestId ? 'bg-tarkov-surface-light' : ''}`;
            item.dataset.id = quest._id;
            item.textContent = quest.QuestName;
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
                item.className = 'flex items-center justify-between p-2 bg-tarkov-surface rounded border border-tarkov-border hover:border-tarkov-accent cursor-pointer transition-colors';
                item.innerHTML = `
                    <div class="flex-1 edit-reward" data-id="${reward.id}" data-timing="${timing}">
                        <span class="text-tarkov-accent">[${timing}]</span>
                        <span class="text-tarkov-text">${reward.type}</span>
                        ${this.getRewardValueDisplay(reward)}
                    </div>
                    <button type="button" class="text-tarkov-danger hover:text-red-400 delete-reward ml-2 px-2" data-id="${reward.id}" data-timing="${timing}">&times;</button>
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
