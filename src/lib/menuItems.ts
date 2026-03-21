export interface MenuItem {
  key: string
  label: string
  icon: string
  visitor: boolean
}

const ALL: Record<string, MenuItem> = {
  account:     { key: 'account',     label: '我的账号',   icon: 'user',     visitor: true },
  personalize: { key: 'personalize', label: '个性化设置', icon: 'palette',  visitor: true },
  groups:      { key: 'groups',      label: '分组管理',   icon: 'folder',   visitor: false },
  system:      { key: 'system',      label: '系统设置',   icon: 'settings', visitor: true },
  icons:       { key: 'icons',       label: '图标管理',   icon: 'image',    visitor: false },
  data:        { key: 'data',        label: '数据管理',   icon: 'database', visitor: false },
  review:      { key: 'review',      label: '审核管理',   icon: 'inbox',    visitor: false },
}

const pick = (...keys: string[]): MenuItem[] => keys.map(k => ALL[k]!)

/** AccountDropdown 下拉菜单项 */
export const DROPDOWN_ITEMS = pick('account', 'personalize', 'groups', 'system')

/** SettingsModal 侧边栏基础项 */
export const SETTINGS_BASE_ITEMS = pick('account', 'personalize', 'groups', 'icons')

/** SettingsModal 管理员专属项 */
export const SETTINGS_ADMIN_ITEMS = pick('data', 'review')
