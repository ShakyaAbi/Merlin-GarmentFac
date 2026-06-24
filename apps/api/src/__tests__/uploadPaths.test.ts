import path from 'path'
import fs from 'fs'
import request from 'supertest'
import app from '../app'
import { getUploadRoot } from '../utils/uploadPaths'

describe('upload paths', () => {
  it('resolves uploads under apps/api regardless of the current working directory', () => {
    expect(getUploadRoot()).toBe(path.resolve(__dirname, '..', '..', 'uploads'))
  })

  it('allows uploaded assets to be embedded by the web app origin', async () => {
    const uploadRoot = getUploadRoot()
    const articlesDir = path.join(uploadRoot, 'articles')
    fs.mkdirSync(articlesDir, { recursive: true })
    fs.writeFileSync(path.join(articlesDir, 'test-image.txt'), 'test asset')

    const response = await request(app).get('/uploads/articles/test-image.txt')

    expect(response.status).toBe(200)
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin')
  })
})
