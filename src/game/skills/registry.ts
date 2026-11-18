import type { SkillDef } from '../types'

const registry = new Map<string, SkillDef>()
export function registerSkill(def: SkillDef): SkillDef {
  if (registry.has(def.id)) throw new Error(`Duplicate skill id: ${def.id}`)
  registry.set(def.id, def)
  return def
}
export function getSkill(id: string | undefined): SkillDef | undefined {
  return id ? registry.get(id) : undefined
}
export function allSkills() { return [...registry.values()] }
