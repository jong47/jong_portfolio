import { systems } from '../data/systems'
import type { RoleId } from '../data/types'

export function systemsForRole(roleId: RoleId) {
    return systems.filter((system) => system.roleIds.includes(roleId))
}
