import fs from 'node:fs'
import path from 'node:path'

const settingsSource = fs.readFileSync(path.resolve(__dirname, '../../../web/pages/Settings.tsx'), 'utf8')

describe('organization settings tab', () => {
  it('exposes organization settings as an admin-only settings tab', () => {
    expect(settingsSource).toContain("{ id: 'organization', label: 'Organization settings', icon: Building2 }")
    expect(settingsSource).toContain("const isAdmin = sessionUser?.role === 'ADMIN'")
  })
})
