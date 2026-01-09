/** Trader ID mapping */
export const TRADERS = {
    BTR        : '656f0f98d80a697f855d34b1',
    Fence      : '579dc571d53a0658a154fbec',
    Jaeger     : '5c0647fdd443bc2504c2d371',
    Legs       : '6748edbcb936f1098d4303e4',
    Lightkeeper: '638f541a29ffd1183d187f57',
    Mechanic   : '5a7c2eca46aef81a7ca2145d',
    Peacekeeper: '5935c25fb3acc3127c3d8cd9',
    Prapor     : '54cb50c76803fa8b248b4571',
    Ragman     : '5ac3b934156ae10c4430e83c',
    Ref        : '6617beeaa9cfa777ca915b7c',
    Skier      : '58330581ace78e27b8b10cee',
    Therapist  : '54cb57776803fa99248b456e',
} as const;

export type TraderId = typeof TRADERS[TraderName];
export type TraderName = keyof typeof TRADERS;
