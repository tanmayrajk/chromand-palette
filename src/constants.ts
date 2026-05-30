export const ItemTypes = {
    SEARCH: "search",
    TAB: "tab",
    HISTORY: "history",
    BANG: "bang"
} as const

export type ItemType = typeof ItemTypes[keyof typeof ItemTypes]

export const Modes = {
    NORMAL: "normal",
    BANG: "bang"
} as const

export type Mode = typeof Modes[keyof typeof Modes]