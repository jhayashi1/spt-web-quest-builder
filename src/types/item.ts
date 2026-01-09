export interface ItemData {
    _id: string;
    _tpl: string;
    parentId?: string;
    slotId?: string;
    upd?: {
        SpawnedInSession?: boolean;
        StackObjectsCount?: number;
    };
}
