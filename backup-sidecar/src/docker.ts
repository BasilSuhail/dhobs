import { execSync } from 'child_process'

export function pauseContainer(containerName: string) {
  try {
    execSync(`docker pause ${containerName}`, { stdio: 'ignore' })
  } catch (e) {
    console.warn(`Failed to pause ${containerName}: ${e}`)
  }
}

export function unpauseContainer(containerName: string) {
  try {
    execSync(`docker unpause ${containerName}`, { stdio: 'ignore' })
  } catch (e) {
    console.warn(`Failed to unpause ${containerName}: ${e}`)
  }
}

export function stopContainer(containerName: string) {
  try {
    execSync(`docker stop ${containerName}`, { stdio: 'ignore' })
  } catch (e) {
    console.warn(`Failed to stop ${containerName}: ${e}`)
  }
}

export function startContainer(containerName: string) {
  try {
    execSync(`docker start ${containerName}`, { stdio: 'ignore' })
  } catch (e) {
    console.warn(`Failed to start ${containerName}: ${e}`)
  }
}
