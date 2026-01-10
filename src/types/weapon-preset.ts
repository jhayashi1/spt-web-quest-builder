/** Weapon preset structure */
export interface WeaponPreset {
    _changeWeaponName: boolean;
    _encyclopedia?: string;
    _id: string;
    _items: WeaponPresetItem[];
    _name: string;
    _parent: string;
    _type: string;
}

/** Weapon preset item structure */
export interface WeaponPresetItem {
    _id: string;
    _tpl: string;
    parentId?: string;
    slotId?: string;
}

/** Complete weapon presets file structure */
export interface WeaponPresetsFile {
    [presetId: string]: WeaponPreset;
}

/** Mod slot options for weapon parts */
export const MOD_SLOTS = [
    'mod_pistol_grip',
    'mod_stock',
    'mod_magazine',
    'mod_barrel',
    'mod_handguard',
    'mod_sight_rear',
    'mod_sight_front',
    'mod_muzzle',
    'mod_gas_block',
    'mod_tactical',
    'mod_mount',
    'mod_scope',
    'mod_foregrip',
    'mod_equipment',
    'mod_mount_000',
    'mod_mount_001',
    'mod_mount_002',
    'mod_mount_003',
    'mod_tactical_000',
    'mod_tactical_001',
    'mod_tactical_002',
    'mod_tactical_003',
    'mod_receiver',
    'mod_charge',
    'mod_trigger',
    'mod_hammer',
    'mod_catch',
    'mod_reciever',
] as const;

export type ModSlot = typeof MOD_SLOTS[number];
