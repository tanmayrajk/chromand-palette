import { ItemType } from "./constants.ts";

export interface historyItem {
  title: string;
  url: string;
  visitCount: number;
  lastVisitTime: number;
  type: ItemType;
}

export interface tabItem {
  title?: string;
  url?: string;
  id: number;
  type: ItemType;
}

export interface bangItem {
  title: string;
  shorthand: string;
  url: string;
  type: ItemType
}

export interface searchItem {
  title: string;
  url: string;
  type: ItemType;
}

export interface activeBangType {
    title: string,
    url: string,
    shorthand: string
}

export interface searchEngine {
  title: string,
  url: string,
  id: number
}