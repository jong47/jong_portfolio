import { systems } from '../data/systems'

export function systemsForRole(roleId: string) {
    return systems.filter((system) => system.roleIds.includes(roleId))
}
