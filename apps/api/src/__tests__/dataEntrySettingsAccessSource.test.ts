import fs from 'node:fs'
import path from 'node:path'

const readWeb = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../../web', relativePath), 'utf8')

describe('role-restricted team, invitations, and settings UI', () => {
  it('filters team and invitation navigation for non-admin users', () => {
    const layoutSource = readWeb('components/Layout.tsx')
    expect(layoutSource).toContain('/admin/users')
    expect(layoutSource).toContain('/admin/invitations')
    expect(layoutSource).toMatch(/currentUser\?\.role\s*===\s*['"]ADMIN['"]|currentUser\?\.role\s*!==\s*['"]ADMIN['"]/)
  })

  it('protects direct team and invitation routes', () => {
    const appSource = readWeb('App.tsx')
    expect(appSource).toMatch(/admin\/users[\s\S]*AdminOnlyRoute/)
    expect(appSource).toMatch(/admin\/invitations[\s\S]*AdminOnlyRoute/)
  })

  it('limits non-admin settings to password security', () => {
    const settingsSource = readWeb('pages/Settings.tsx')
    expect(settingsSource).toContain("sessionUser?.role === 'ADMIN'")
    expect(settingsSource).toMatch(/isAdmin\s*&&\s*activeTab\s*===\s*['"]profile['"]/)
    expect(settingsSource).toMatch(/isAdmin\s*&&\s*activeTab\s*===\s*['"]system['"]/)
  })

  it('keeps profile and organization updates admin-only while allowing password changes', () => {
    const authRouteSource = fs.readFileSync(path.resolve(__dirname, '../routes/authRoutes.ts'), 'utf8')
    expect(authRouteSource).toContain("router.patch('/me', authenticate, requireRoles(Role.ADMIN)")
    expect(authRouteSource).toContain("router.patch('/me/password', authenticate, validate(changePasswordSchema)")
  })
})
