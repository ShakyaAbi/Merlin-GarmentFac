import path from 'path'

export function getUploadRoot() {
  return path.resolve(__dirname, '..', '..', 'uploads')
}

export function getArticleUploadRoot() {
  return path.join(getUploadRoot(), 'articles')
}
