export const ItemTypes = {
    SEARCH: "search",
    TAB: "tab",
    HISTORY: "history",
    BANG: "bang"
} as const

export type ItemType = typeof ItemTypes[keyof typeof ItemTypes]