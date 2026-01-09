/** Assort item for trader inventory */
export interface AssortItem {
    _id: string;
    _tpl: string;
    parentId?: string;
    slotId?: string;
    upd?: {
        StackObjectsCount?: number;
        UnlimitedCount?: boolean;
    };
}

/** Full barter scheme (array of requirements) */
export type BarterScheme = BarterSchemeItem[][];

/** Barter scheme entry (price) */
export interface BarterSchemeItem {
    _tpl: string;
    count: number;
}

/** Loyalty level requirement */
export interface LoyalLevel {
    loyaltyLevel: number;
}

/** Quest lock for an item */
export interface QuestLock {
    questId: string;
}

/** Trader assort structure */
export interface TraderAssort {
    barter_scheme: Record<string, BarterScheme>;
    items: AssortItem[];
    loyal_level_items: Record<string, number>;
    questassort?: {
        fail: Record<string, string>;
        started: Record<string, string>;
        success: Record<string, string>;
    };
}

/** Currency types */
export const CURRENCIES = {
    Dollars: '5696686a4bdc2da3298b456a',
    Euros  : '569668774bdc2da2298b4568',
    Roubles: '5449016a4bdc2d6f028b456f',
} as const;

export type CurrencyType = keyof typeof CURRENCIES;
