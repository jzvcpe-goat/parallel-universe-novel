import { execFileSync } from 'node:child_process'

function gitValue(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  }).trim()
}

export function readR1A0RepositoryIdentity({
  root,
  expectedHeadSha,
  branch,
}) {
  const checkoutSha = gitValue(root, ['rev-parse', 'HEAD'])
  const pullRequestHeadSha = expectedHeadSha || checkoutSha
  if (checkoutSha !== pullRequestHeadSha) {
    throw new Error(
      `R1-A0 evidence checkout ${checkoutSha} does not match PR head ${pullRequestHeadSha}`,
    )
  }
  return {
    checkoutSha,
    pullRequestHeadSha,
    pullRequestHeadTreeSha: gitValue(root, ['rev-parse', 'HEAD^{tree}']),
    branch: branch || gitValue(root, ['branch', '--show-current']),
  }
}
