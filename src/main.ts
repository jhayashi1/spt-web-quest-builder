import './styles/main.css';
import {FACTIONS} from './constants/factions';
import {LOCATIONS} from './constants/locations';
import {QUEST_TYPES} from './constants/quest-types';
import {type TraderName, TRADERS} from './constants/traders';
import {type Quest, type QuestFile} from './types/quest';
import {createDefaultMessages, downloadJson, generateId, readJsonFile} from './utils/helpers';

/** Application State */
class QuestBuilder {
    private currentQuestId: null | string = null;
    private quests: QuestFile = {};

    constructor() {
        this.initializeUI();
        this.bindEvents();
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
    }

    private clearForm(): void {
        const form = document.getElementById('questForm') as HTMLFormElement;
        form.reset();
        const idDisplay = document.getElementById('questIdDisplay');
        if (idDisplay) idDisplay.textContent = '-';
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

    private exportQuests(): void {
        if (Object.keys(this.quests).length === 0) {
            alert('No quests to export');
            return;
        }

        downloadJson(this.quests, 'quests.json');
        this.showToast('Quests exported!');
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
        (form.querySelector('[name="instantComplete"]') as HTMLInputElement).checked = quest.instantComplete;
        (form.querySelector('[name="restartable"]') as HTMLInputElement).checked = quest.restartable;
        (form.querySelector('[name="secretQuest"]') as HTMLInputElement).checked = quest.secretQuest;
        (form.querySelector('[name="isKey"]') as HTMLInputElement).checked = quest.isKey;
        (form.querySelector('[name="canShowNotifications"]') as HTMLInputElement).checked = quest.canShowNotificationsInGame;

        // Update ID display
        const idDisplay = document.getElementById('questIdDisplay');
        if (idDisplay) idDisplay.textContent = quest._id;
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
            canShowNotificationsInGame: formData.get('canShowNotifications') === 'on',
            description               : formData.get('description') as string,
            instantComplete           : formData.get('instantComplete') === 'on',
            isKey                     : formData.get('isKey') === 'on',
            location                  : formData.get('location') as Quest['location'],
            QuestName                 : formData.get('questName') as string,
            restartable               : formData.get('restartable') === 'on',
            secretQuest               : formData.get('secretQuest') === 'on',
            side                      : formData.get('faction') as Quest['side'],
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
}

// Initialize app
new QuestBuilder();
