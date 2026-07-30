import path from 'node:path'

export function resolveMiroFishInvocation(env = process.env) {
  const sourceProject = env.PUF_MIROFISH_PROJECT?.trim()
  if (sourceProject) {
    const projectPath = path.resolve(sourceProject)
    return {
      command: env.PUF_MIROFISH_UV_COMMAND?.trim() || 'uv',
      argsPrefix: [
        'run',
        '--project',
        projectPath,
        'mirofish',
      ],
      mode: 'source_project',
      projectPath,
    }
  }

  return {
    command: env.PUF_MIROFISH_COMMAND?.trim() || 'mirofish',
    argsPrefix: [],
    mode: 'executable',
    projectPath: null,
  }
}

export function isMiroFishConfigured(env = process.env) {
  return Boolean(env.PUF_MIROFISH_PROJECT?.trim() || env.PUF_MIROFISH_COMMAND?.trim())
}
