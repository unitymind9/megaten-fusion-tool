import TRANSLATIONS_JSON from '../data/translations.json';
import FUSION_TOOLS_JSON from '../data/fusion-tools.json';
import DEMON_NAMES_JSON from '../data/demon-names.json';
import ENEMY_NAMES_JSON from '../data/enemy-names.json';
import SKILL_NAMES_JSON from '../data/skill-names.json';
import RACE_NAMES_JSON from '../data/race-names.json';
import ELEM_NAMES_JSON from '../data/elem-names.json';
import ITEM_NAMES_JSON from '../data/item-names.json';
import AREA_NAMES_JSON from '../data/area-names.json';

import { DemonUnlock } from './fusion-settings';
type ListLookup = { [name: string]: string[] };

export class CompendiumTranslator {
  private static translationOverrides: { [word: string]: string[] } = {};

  static loadOverrides(overrides: { [word: string]: string[] }) {
    CompendiumTranslator.translationOverrides = overrides;
  }

  private langToCode(language: string): number {
    return TRANSLATIONS_JSON.Languages.Languages.slice(1).indexOf(language);
  }

  private translate(word: string, langCode: number, lookup: ListLookup): string {
    const overrideTranslations = CompendiumTranslator.translationOverrides[word];
    if (overrideTranslations) {
      const override = overrideTranslations[langCode];
      if (override) {
        return override;
      }
    }

    if (langCode === -1) { return word; }
    const suffixMatch = word.match(/^(.*) ([A-HJ-Z])$/);
    const fromWord = suffixMatch ? suffixMatch[1] : word;

    if (lookup === AREA_NAMES_JSON) {
      let bestMatch = '';
      for (const key in lookup) {
        if (fromWord.startsWith(key) && key.length > bestMatch.length) {
          bestMatch = key;
        }
      }

      if (bestMatch) {
        const toWord = (lookup[bestMatch] || [])[langCode] || bestMatch;
        const rest = fromWord.substring(bestMatch.length);
        const translated = toWord + rest;
        return suffixMatch ? `${translated} ${suffixMatch[2]}` : translated;
      }
    }

    const toWord = (lookup[fromWord] || [])[langCode] || fromWord;
    return suffixMatch ? `${toWord} ${suffixMatch[2]}` : toWord;
  }

  private translateList(oldList: string[], language: string, lookup: ListLookup): string[] {
    const langCode = this.langToCode(language);
    return langCode === -1 ? oldList : oldList.map(w => this.translate(w, langCode, lookup));
  }

  get supportedLanguages(): string[] { return TRANSLATIONS_JSON.Languages.Languages.slice(1); }

  translateRaces(oldRaces: string[], language: string): string[] { return this.translateList(oldRaces, language, RACE_NAMES_JSON); }
  translateElems(oldStats: string[], language: string): string[] { return this.translateList(oldStats, language, ELEM_NAMES_JSON); }

  translateAppTitle(oldTitle: string, language: string): string {
    const langCode = this.langToCode(language);
    const newTitles = Object.values(FUSION_TOOLS_JSON).find(t => t[0] === oldTitle) || [];
    return langCode === -1 ? oldTitle : newTitles[langCode + 1] || oldTitle;
  }

  translateSettingsKey(oldKey: string, language: string): string {
    return this.langToCode(language) === -1 ? oldKey : `${oldKey}-${language}`;
  }

  translateDemonData(oldDemons: any, language: string): any {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldDemons; }
    const newDemons = {};

    for (const [dname, entry] of Object.entries(oldDemons)) {
      const newEntry = Object.assign({}, entry);
      newEntry['origName'] = dname;

      for (const skillSet of ['skills', 'skillCards']) {
        if (entry[skillSet]) {
          newEntry[skillSet] = {};
          for (const [sname, lvl] of Object.entries(entry[skillSet])) {
            newEntry[skillSet][this.translate(sname, langCode, SKILL_NAMES_JSON)] = lvl;
          }
        }
      }

      for (const extraSkill of ['innate', 'trait']) {
        if (entry[extraSkill]) {
          newEntry[extraSkill] = this.translate(entry[extraSkill], langCode, SKILL_NAMES_JSON);
        }
      }

      newEntry['origRace'] = entry['race'];
      newEntry['race'] = this.translate(entry['race'], langCode, RACE_NAMES_JSON);

      if (entry['item']) {
        newEntry['item'] = entry['item'].split(', ').map(i => this.translate(i, langCode, SKILL_NAMES_JSON)).join(', ');
      }

      newDemons[this.translate(dname, langCode, DEMON_NAMES_JSON)] = newEntry;
    }

    return newDemons;
  }

  translateEnemyData(oldEnemies: any, language: string): any {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldEnemies; }
    const newEnemies = {};

    for (const [dname, entry] of Object.entries(oldEnemies)) {
      const newEntry = Object.assign({}, entry);

      if (Array.isArray(entry['skills'])) {
        newEntry['skills'] = this.translateList(entry['skills'], language, SKILL_NAMES_JSON);
      }

      if (typeof entry['persona'] === 'string') {
        newEntry['persona'] = this.translate(entry['persona'], langCode, DEMON_NAMES_JSON);
      }

      if (Array.isArray(entry['drops'])) {
        newEntry['drops'] = entry['drops'].map(d => {
          const skillName = this.translate(d, langCode, SKILL_NAMES_JSON);
          return skillName !== d ? skillName : this.translate(d, langCode, ITEM_NAMES_JSON);
        });
      }

      if (typeof entry['dodds'] === 'object' && entry['dodds'] !== null) {
        const newDodds = {};
        for (const [itemName, chance] of Object.entries(entry['dodds'])) {
          const skillName = this.translate(itemName, langCode, SKILL_NAMES_JSON);
          const newItemName = skillName !== itemName ? skillName : this.translate(itemName, langCode, ITEM_NAMES_JSON);
          newDodds[newItemName] = chance;
        }
        newEntry['dodds'] = newDodds;
      }

      if (typeof entry['area'] === 'string') {
        newEntry['area'] = this.translate(entry['area'], langCode, AREA_NAMES_JSON);
      } else if (Array.isArray(entry['area'])) {
        newEntry['area'] = this.translateList(entry['area'], language, AREA_NAMES_JSON);
      }

      if (Array.isArray(entry['areas'])) {
        newEntry['areas'] = this.translateList(entry['areas'], language, AREA_NAMES_JSON);
      }

      if (typeof entry['race'] === 'string') {
        newEntry['race'] = this.translate(entry['race'], langCode, RACE_NAMES_JSON);
      }

      newEnemies[this.translate(dname, langCode, ENEMY_NAMES_JSON)] = newEntry;
    }

    return newEnemies;
  }

  translateSkillData(oldSkills: any, language: string): any {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldSkills; }
    const newSkills = {};

    for (const [sname, entry] of Object.entries(oldSkills)) {
      const newEntry = Object.assign({}, entry);
      const target = newEntry['target'] || 'Self';
      newEntry['target'] = this.translate(newEntry['target'] || 'Self', langCode, ELEM_NAMES_JSON);

      if (newEntry['card']) {
        newEntry['card'] = newEntry['card'].split(', ').map(d => this.translate(d, langCode, DEMON_NAMES_JSON)).join(', ');
      }

      newSkills[this.translate(sname, langCode, SKILL_NAMES_JSON)] = newEntry;
    }

    return newSkills;
  }

  translateSpecialRecipes(oldRecipes: ListLookup, language: string): ListLookup {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldRecipes; }
    const newRecipes = {};

    for (const [dname, recipe] of Object.entries(oldRecipes)) {
      newRecipes[this.translate(dname, langCode, DEMON_NAMES_JSON)] = recipe.map(
        r => r.split(' x ').map(i => this.translate(this.translate(i, langCode, DEMON_NAMES_JSON), langCode, RACE_NAMES_JSON)).join(' x ')
      );
    }

    return newRecipes;
  }

  translateFusionSpells(oldCards: ListLookup, language: string): ListLookup {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldCards; }
    const newCards = {};

    for (const [dname, recipe] of Object.entries(oldCards)) {
      newCards[this.translate(dname, langCode, SKILL_NAMES_JSON)] = recipe.map(c =>
        this.translate(this.translate(c, langCode, RACE_NAMES_JSON), langCode, DEMON_NAMES_JSON)
      );
    }

    return newCards;
  }

  translateFusionChart(oldChart: any, language: string): any {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldChart; }

    const newChart = {
      races: oldChart['races'].map(race => this.translate(race, langCode, RACE_NAMES_JSON)),
      table: oldChart['table']
    };

    if (oldChart['elems']) {
      newChart['elems'] = oldChart['elems'].map(race => this.translate(race, langCode, DEMON_NAMES_JSON));
    } else {
      newChart['table'] = oldChart['table'].map(row => row.map(race =>
        this.translate(this.translate(race, langCode, RACE_NAMES_JSON), langCode, DEMON_NAMES_JSON)
      ));
    }

    if (oldChart['pairs']) {
      newChart['pairs'] = oldChart['pairs'].map(row => row.map(race =>
        this.translate(this.translate(race, langCode, RACE_NAMES_JSON), langCode, DEMON_NAMES_JSON)
      ));
    }

    return newChart;
  }

  translateDemonUnlocks(oldUnlocks: DemonUnlock[], language: string): DemonUnlock[] {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldUnlocks; }
    const newUnlocks: DemonUnlock[] = [];

    for (const { category, unlocked, conditions } of oldUnlocks) {
      const newConditions = {};

      for (const [name, cond] of Object.entries(conditions)) {
        const enName = name.split(',').map(d => this.translate(d, langCode, DEMON_NAMES_JSON)).join(',');
        newConditions[enName] = cond;
      }

      newUnlocks.push({
        category,
        unlocked,
        conditions: newConditions
      });
    }

    return newUnlocks;
  }

  translateEvolutions(oldEvolves: any, language: string): any {
    const langCode = this.langToCode(language);
    if (langCode === -1) { return oldEvolves; }
    const newEvolves = {};

    for (const [dname, recipe] of Object.entries(oldEvolves)) {
      newEvolves[this.translate(dname, langCode, DEMON_NAMES_JSON)] = {
        lvl: recipe['lvl'],
        result: this.translate(recipe['result'], langCode, DEMON_NAMES_JSON)
      };
    }

    return newEvolves;
  }
}
